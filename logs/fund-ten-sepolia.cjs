const fs = require('node:fs');
const hre = require('hardhat');
const {JsonRpcProvider,parseEther,formatEther,keccak256} = require('ethers');
const {loadAccounts,acquireAccountLock} = require('../tasks/experiments/accounts');
const file='logs/sepolia-ten-eth-funding.json';
const target=parseEther('10'), feeBuffer=parseEther('0.01');
const owner='0x940a5ca24aFe2b971f91FBF9112CafDCe0A73F6B';
const senderAddress='0x3552Cc153DCcC007d1c0D88Ff5aDB258d2688121';
const p=new JsonRpcProvider(hre.config.networks.sepolia.url,undefined,{cacheTimeout:-1});
let report,release;
function save(){fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
async function main(){
  if((await p.getNetwork()).chainId!==11155111n)throw new Error('Wrong chain');
  release=acquireAccountLock('.benchmark-accounts/accounts.secret.json');
  const wallets=loadAccounts('.benchmark-accounts/accounts.secret.json',p);
  const manifest=JSON.parse(fs.readFileSync('.benchmark-accounts/addresses.json','utf8'));
  if(wallets.length!==8||wallets[0].address!==senderAddress||wallets.some((w,i)=>w.address!==manifest.accounts[i].address))
    throw new Error('Unexpected benchmark account manifest');
  const accounts=[{id:'owner',address:owner},...manifest.accounts];
  const balances=async()=>Promise.all(accounts.map(async a=>({...a,balanceEth:formatEther(await p.getBalance(a.address))})));
  report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{
    chainId:11155111,targetEth:'10',createdAt:new Date().toISOString(),startBlock:await p.getBlockNumber(),
    sender:senderAddress,initialAccounts:await balances(),claims:[],transfers:[],status:'collecting'};
  if(report.chainId!==11155111||report.sender!==senderAddress||report.targetEth!=='10')throw new Error('Funding ledger mismatch');
  save();
  // Reconcile all journaled transfers before allocating any further funds.
  for(const t of report.transfers){
    const receipt=await p.getTransactionReceipt(t.hash);
    if(receipt?.status!==1)throw new Error('Unresolved prior transfer; reconcile before continuing');
    t.status='confirmed';t.blockNumber=receipt.blockNumber;t.actualFeeWei=receipt.fee.toString();
  }
  const flag=process.argv.indexOf('--claim');
  if(flag>=0){
    const hash=process.argv[flag+1];
    if(!/^0x[0-9a-fA-F]{64}$/.test(hash||''))throw new Error('Invalid claim hash');
    if(!report.claims.some(c=>c.hash===hash)){
      const tx=await p.getTransaction(hash),r=await p.getTransactionReceipt(hash);
      if(!tx||r?.status!==1||r.blockNumber<report.startBlock||tx.to!==senderAddress||
        tx.from.toLowerCase()!=='0x6cc9397c3b38739dacbfaa68ead5f5d77ba5f455'||tx.value<parseEther('0.05')||tx.value>parseEther('2.5'))
        throw new Error('Unverified new faucet claim');
      report.claims.push({hash,valueWei:tx.value.toString(),valueEth:formatEther(tx.value),blockNumber:r.blockNumber});
      save();
    }
  }
  const received=report.claims.reduce((n,c)=>n+BigInt(c.valueWei),0n);
  if(received>parseEther('90'))throw new Error('Collection budget reached; review before any further funding');
  const preserved=parseEther(report.initialAccounts.find(a=>a.address===senderAddress).balanceEth);
  const sender=wallets[0];
  if(process.argv.includes('--distribute')||flag>=0){
    // Fund the eight other accounts first; the collection account reaches 10 ETH last.
    // Keep all pre-existing balances in place and distribute only verified new claims.
    for(const account of accounts.filter(a=>a.address!==senderAddress)){
      const balance=await p.getBalance(account.address);
      if(balance>=target)continue;
      const allocated=report.transfers.reduce((n,t)=>n+BigInt(t.valueWei)+BigInt(t.actualFeeWei||t.maxFeeWei),0n);
      let available=received-allocated-feeBuffer;
      const liquid=(await p.getBalance(senderAddress))-preserved-feeBuffer;
      if(liquid<available)available=liquid;
      if(available<=0n)break;
      const latest=await p.getTransactionCount(senderAddress,'latest'),pending=await p.getTransactionCount(senderAddress,'pending');
      if(latest!==pending)throw new Error('Unresolved sender nonce');
      const fees=await p.getFeeData();
      if(fees.maxFeePerGas==null||fees.maxPriorityFeePerGas==null)throw new Error('Fee estimate unavailable');
      const needed=target-balance,value=needed<available?needed:available;
      const gas=await p.estimateGas({from:senderAddress,to:account.address,value});
      const gasLimit=(gas*120n+99n)/100n,maximumFee=gasLimit*fees.maxFeePerGas;
      if(maximumFee>parseEther('0.005'))throw new Error('Transfer fee exceeds allowance');
      if((await p.getBalance(senderAddress))-value-maximumFee<preserved)throw new Error('Original sender balance would be spent');
      const signed=await sender.signTransaction({chainId:11155111,type:2,nonce:latest,to:account.address,value,gasLimit,
        maxFeePerGas:fees.maxFeePerGas,maxPriorityFeePerGas:fees.maxPriorityFeePerGas});
      const entry={to:account.address,valueWei:value.toString(),maxFeeWei:maximumFee.toString(),nonce:latest,
        hash:keccak256(signed),status:'prepared'};
      report.transfers.push(entry);save();
      const tx=await p.broadcastTransaction(signed);
      if(tx.hash!==entry.hash)throw new Error('Broadcast hash mismatch');
      entry.status='pending';save();console.log('Submitted',account.id,formatEther(value),tx.hash);
      const receipt=await p.waitForTransaction(tx.hash,1,120000);
      if(receipt?.status!==1)throw new Error('Transfer not confirmed successfully');
      entry.status='confirmed';entry.blockNumber=receipt.blockNumber;entry.actualFeeWei=receipt.fee.toString();save();
    }
  }
  report.accounts=await balances();
  report.verifiedAt=new Date().toISOString();
  const deficit=report.accounts.reduce((n,a)=>{const d=target-parseEther(a.balanceEth);return n+(d>0n?d:0n);},0n);
  report.remainingEth=formatEther(deficit);report.totalClaimedEth=formatEther(received);
  report.status=deficit===0n?'complete':'collecting';save();
  console.log(JSON.stringify({status:report.status,remainingEth:report.remainingEth,totalClaimedEth:report.totalClaimedEth,
    accounts:report.accounts,report:file},null,2));
}
main().catch(error=>{console.error('Funding stopped:',error.code||error.message);process.exitCode=1;})
 .finally(()=>{if(release)release();p.destroy();});
