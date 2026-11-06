const fs = require('node:fs');
const hre = require('hardhat');
const {JsonRpcProvider,parseEther,formatEther,keccak256} = require('ethers');
const {loadAccounts,acquireAccountLock} = require('../tasks/experiments/accounts');
const claimHash = process.argv[2];
const file = 'logs/sepolia-reserve-funding-2026-10-21.json';
const provider = new JsonRpcProvider(hre.config.networks.sepolia.url,undefined,{cacheTimeout:-1});
const target = parseEther('0.1');
const preservedSenderBalance = parseEther('0.170248567778517');
const owner = '0x940a5ca24aFe2b971f91FBF9112CafDCe0A73F6B';
let release, report;
function save(){fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
async function main(){
  if(!/^0x[0-9a-fA-F]{64}$/.test(claimHash||''))throw new Error('Provide confirmed faucet claim hash');
  if((await provider.getNetwork()).chainId!==11155111n)throw new Error('Wrong chain');
  release=acquireAccountLock('.benchmark-accounts/accounts.secret.json');
  const wallets=loadAccounts('.benchmark-accounts/accounts.secret.json',provider);
  const manifest=JSON.parse(fs.readFileSync('.benchmark-accounts/addresses.json','utf8'));
  if(wallets.length!==8||wallets.some((w,i)=>w.address!==manifest.accounts[i].address))throw new Error('Account manifest mismatch');
  const sender=wallets[0];
  if(sender.address!=='0x3552Cc153DCcC007d1c0D88Ff5aDB258d2688121')throw new Error('Unexpected funding sender');
  const claim=await provider.getTransaction(claimHash), receipt=await provider.getTransactionReceipt(claimHash);
  if(!claim||receipt?.status!==1||claim.to!==sender.address||claim.value<parseEther('0.36')||
    claim.from.toLowerCase()!=='0x6cc9397c3b38739dacbfaa68ead5f5d77ba5f455')throw new Error('Unverified faucet payout');
  report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{chainId:11155111,claimHash,
    claimedEth:formatEther(claim.value),sender:sender.address,targetWorkerEth:'0.1',preservedSenderEth:formatEther(preservedSenderBalance),transfers:[]};
  if(report.claimHash!==claimHash||report.sender!==sender.address)throw new Error('Funding journal mismatch');
  for(const tx of report.transfers){const r=await provider.getTransactionReceipt(tx.hash);
    if(r?.status!==1)throw new Error('Previous transfer unresolved; reconcile before retry');tx.status='confirmed';}
  save();
  for(const wallet of wallets.slice(1)){
    const balance=await provider.getBalance(wallet.address);
    if(balance>=target)continue;
    if(report.transfers.some(t=>t.to===wallet.address))throw new Error('Previously funded balance changed');
    const latest=await provider.getTransactionCount(sender.address,'latest'),pending=await provider.getTransactionCount(sender.address,'pending');
    if(latest!==pending)throw new Error('Unresolved sender nonce');
    const fees=await provider.getFeeData();
    if(fees.maxFeePerGas==null||fees.maxPriorityFeePerGas==null)throw new Error('Fees unavailable');
    const value=target-balance;
    const estimate=await provider.estimateGas({from:sender.address,to:wallet.address,value});
    const gasLimit=(estimate*120n+99n)/100n,maximumFee=gasLimit*fees.maxFeePerGas;
    if(maximumFee>parseEther('0.005'))throw new Error('Transfer fee allowance exceeded');
    if((await provider.getBalance(sender.address))-value-maximumFee<preservedSenderBalance)throw new Error('Existing sender funds would be spent');
    const allocated=report.transfers.reduce((n,t)=>n+BigInt(t.valueWei)+BigInt(t.maxFeeWei),0n);
    if(allocated+value+maximumFee>claim.value)throw new Error('New mining proceeds exceeded');
    const signed=await sender.signTransaction({chainId:11155111,type:2,nonce:latest,to:wallet.address,value,gasLimit,
      maxFeePerGas:fees.maxFeePerGas,maxPriorityFeePerGas:fees.maxPriorityFeePerGas});
    const entry={to:wallet.address,valueWei:value.toString(),maxFeeWei:maximumFee.toString(),nonce:latest,
      gasLimit:gasLimit.toString(),hash:keccak256(signed),status:'prepared'};
    report.transfers.push(entry);save();
    const tx=await provider.broadcastTransaction(signed);
    if(tx.hash!==entry.hash)throw new Error('Transaction hash mismatch');
    entry.status='pending';save();console.log('Submitted',wallet.address,formatEther(value),tx.hash);
    const mined=await provider.waitForTransaction(tx.hash,1,120000);
    if(mined?.status!==1)throw new Error('Transfer not confirmed successfully');
    entry.status='confirmed';entry.blockNumber=mined.blockNumber;entry.actualFeeWei=mined.fee.toString();save();
    console.log('Confirmed',wallet.address);
  }
  report.accounts=await Promise.all([{id:'owner',address:owner},...manifest.accounts].map(async a=>({...a,
    balanceEth:formatEther(await provider.getBalance(a.address))})));
  if(report.accounts.some(a=>parseEther(a.balanceEth)<(a.id==='owner'?parseEther('1'):target)))throw new Error('Funding target not met');
  report.status='complete';report.completedAt=new Date().toISOString();save();console.log(JSON.stringify(report.accounts,null,2));
}
main().catch(error=>{console.error('Reserve funding stopped:',error.code||error.message);process.exitCode=1;})
 .finally(()=>{if(release)release();provider.destroy();});
