const fs=require('node:fs');
const {parseEther,formatEther,HDNodeWallet,Wallet}=require('ethers');
const hre=require('hardhat');
const inventory=JSON.parse(fs.readFileSync('logs/sepolia-funding-inventory.json','utf8'));
const total=inventory.accounts.reduce((n,a)=>n+parseEther(a.balanceEth),0n);
const reserve=parseEther('0.00001');
const target=(total-reserve)/BigInt(inventory.accounts.length);
let ownerSignerStatus='unavailable';
try { const config=hre.config.networks.sepolia.accounts;
 const signer=Array.isArray(config)?new Wallet(config[0]):HDNodeWallet.fromPhrase(config.mnemonic,config.passphrase,`${config.path||"m/44'/60'/0'/0"}/${config.initialIndex||0}`);
 ownerSignerStatus=signer.address===inventory.accounts[0].address?'validated':'address-mismatch';
} catch {ownerSignerStatus='invalid-local-signer-configuration';}
const plan={chainId:11155111,status:ownerSignerStatus==='validated'?'ready':'blocked-owner-signer',ownerSignerStatus,
 createdAt:new Date().toISOString(),accountCount:inventory.accounts.length,totalEth:formatEther(total),
 targetBalanceEth:formatEther(target),feeReserveEth:formatEther(reserve),
 accounts:inventory.accounts.map(a=>({...a,deltaEth:formatEther(target-parseEther(a.balanceEth))})),
 note:'No transfers sent. Restore the deployment owner signer locally before redistribution. Funding automation paused.'};
fs.writeFileSync('logs/sepolia-redistribution-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify(plan,null,2));
