const fs=require('node:fs');
const hre=require('hardhat');
const {HDNodeWallet,Wallet,JsonRpcProvider,parseEther,formatEther,keccak256}=require('ethers');
const {acquireAccountLock}=require('../tasks/experiments/accounts');
const journal='logs/sepolia-split-user-funds.json';
const source='0x8f3FCeEcedab52f783762040ce130DBf755765e7';
const expected=['0xbFfa3190d423F15C1E5281a10e5d89B3Dcf26eD0','0xB85E3C85c39e2FD06308649F466d360B0bE792af'];
const p=new JsonRpcProvider(hre.config.networks.sepolia.url,undefined,{cacheTimeout:-1});
let release,report;
function save(){fs.writeFileSync(journal,JSON.stringify(report,null,2)+'\n');}
(async()=>{
 if((await p.getNetwork()).chainId!==11155111n)throw Error('Wrong chain');
 release=acquireAccountLock('.benchmark-accounts/accounts.secret.json');
 const accounts=JSON.parse(fs.readFileSync('.benchmark-accounts/accounts.secret.json','utf8')).accounts;
 for(let i=0;i<2;i++)if(accounts[i+1].address!==expected[i]||new Wallet(accounts[i+1].privateKey).address!==expected[i])throw Error('Recipient mismatch');
 if(fs.existsSync(journal)){
  report=JSON.parse(fs.readFileSync(journal,'utf8'));
  if(report.source!==source||report.chainId!==11155111||report.transfers.length!==2)throw Error('Existing funding journal requires reconciliation');
  for(const t of report.transfers){const r=await p.getTransactionReceipt(t.hash);if(r?.status!==1)throw Error('Existing transfer unresolved');}
  console.log(JSON.stringify({status:'already-confirmed',transfers:report.transfers}));return;
 }
 const phrase=fs.readFileSync(0,'utf8').trim();
 const wallet=HDNodeWallet.fromPhrase(phrase).connect(p);
 if(wallet.address!==source)throw Error('Source signer mismatch');
 const nonce=await p.getTransactionCount(source,'latest');
 if(nonce!==await p.getTransactionCount(source,'pending'))throw Error('Source has unresolved pending transactions');
 if((await p.getCode(source))!=='0x')throw Error('Unexpected sender code');
 for(const address of expected)if((await p.getCode(address))!=='0x')throw Error('Unexpected recipient code');
 const balance=await p.getBalance(source),fees=await p.getFeeData();
 if(fees.maxFeePerGas===null||fees.maxPriorityFeePerGas===null)throw Error('Fees unavailable');
 const estimates=await Promise.all(expected.map(to=>p.estimateGas({from:source,to,value:1n})));
 const limits=estimates.map(g=>(g*120n+99n)/100n);
 const maxFees=limits.reduce((n,g)=>n+g*fees.maxFeePerGas,0n);
 if(maxFees>parseEther('0.001'))throw Error('Fee cap exceeded');
 const reserve=parseEther('0.00001'),amount=(balance-maxFees-reserve)/2n;
 if(amount<=0n)throw Error('Insufficient funds');
 report={chainId:11155111,source,createdAt:new Date().toISOString(),initialSourceEth:formatEther(balance),
  initialRecipients:await Promise.all(expected.map(async address=>({address,balanceEth:formatEther(await p.getBalance(address))}))),
  amountEachEth:formatEther(amount),gasReserveEth:formatEther(reserve),transfers:[],status:'prepared'};save();
 for(let i=0;i<2;i++){
  const current=await p.getTransactionCount(source,'latest');
  if(current!==nonce+i||await p.getTransactionCount(source,'pending')!==current)throw Error('Nonce state changed');
  const transaction={chainId:11155111,type:2,nonce:current,to:expected[i],value:amount,gasLimit:limits[i],maxFeePerGas:fees.maxFeePerGas,maxPriorityFeePerGas:fees.maxPriorityFeePerGas};
  if(await p.getBalance(source)<amount+limits[i]*fees.maxFeePerGas)throw Error('Balance changed');
  const signed=await wallet.signTransaction(transaction);
  const entry={to:expected[i],valueEth:formatEther(amount),nonce:current,hash:keccak256(signed),status:'prepared'};
  report.transfers.push(entry);save();
  const tx=await p.broadcastTransaction(signed);if(tx.hash!==entry.hash)throw Error('Hash mismatch');
  entry.status='pending';save();console.log(JSON.stringify({submitted:entry.hash,to:entry.to,valueEth:entry.valueEth}));
  const receipt=await p.waitForTransaction(tx.hash,1,120000);
  if(receipt?.status!==1)throw Error('Receipt unresolved or reverted');
  entry.status='confirmed';entry.blockNumber=receipt.blockNumber;entry.feeWei=receipt.fee.toString();save();
 }
 report.finalBalances=await Promise.all([source,...expected].map(async address=>({address,balanceEth:formatEther(await p.getBalance(address))})));
 report.status='complete';report.completedAt=new Date().toISOString();save();
 console.log(JSON.stringify({status:report.status,amountEachEth:report.amountEachEth,transfers:report.transfers,balances:report.finalBalances},null,2));
})().catch(()=>{console.error('Transfer stopped; reconcile public funding journal before any retry.');process.exitCode=1;}).finally(()=>{if(release)release();p.destroy();});
