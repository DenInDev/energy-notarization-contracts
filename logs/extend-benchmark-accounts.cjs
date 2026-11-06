const fs=require('node:fs');
const {Wallet,verifyMessage}=require('ethers');
const {loadAccounts,acquireAccountLock}=require('../tasks/experiments/accounts');
const dir='.benchmark-accounts',file=dir+'/accounts.secret.json';
let release;
(async()=>{
 release=acquireAccountLock(file);
 const before=fs.readFileSync(file,'utf8'),data=JSON.parse(before);
 loadAccounts(file);
 if(![8,10].includes(data.accounts.length))throw Error('Unexpected existing account count');
 const original=data.accounts.map(a=>({...a}));
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const backupDir=dir+'/backups';fs.mkdirSync(backupDir,{recursive:true});
 function durableWrite(name,text){const fd=fs.openSync(name,'wx',0o600);try{fs.writeFileSync(fd,text);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
 if(data.accounts.length===8){
  durableWrite(backupDir+'/accounts-before-extension-'+stamp+'.secret.json',before);
  for(let i=8;i<10;i++){const w=Wallet.createRandom();data.accounts.push({id:`user-${i+1}`,address:w.address,privateKey:w.privateKey});}
  const pending=file+'.pending';durableWrite(pending,JSON.stringify(data,null,2)+'\n');
  const staged=loadAccounts(pending);if(staged.length!==10)throw Error('Staged key verification failed');
  fs.renameSync(pending,file);
 }
 const saved=JSON.parse(fs.readFileSync(file,'utf8'));
 if(original.some((a,i)=>JSON.stringify(a)!==JSON.stringify(saved.accounts[i])))throw Error('Existing accounts changed');
 const wallets=loadAccounts(file);if(wallets.length!==10)throw Error('Expected ten locally saved accounts');
 const challenge='Local Sepolia benchmark account key verification; no blockchain transaction';
 for(const w of wallets){if(verifyMessage(challenge,await w.signMessage(challenge))!==w.address)throw Error('Signing verification failed');}
 const backup=backupDir+'/accounts-ten-'+stamp+'.secret.json';
 durableWrite(backup,fs.readFileSync(file,'utf8'));
 if(loadAccounts(backup).some((w,i)=>w.address!==wallets[i].address))throw Error('Backup validation failed');
 const manifest={chainId:11155111,network:'sepolia',accounts:saved.accounts.map(a=>({id:a.id,address:a.address}))};
 fs.writeFileSync(dir+'/addresses.json',JSON.stringify(manifest,null,2)+'\n');
 const report={verifiedAt:new Date().toISOString(),count:wallets.length,uniqueAddresses:new Set(wallets.map(w=>w.address)).size,allKeysReloadedAndSigningVerified:true,originalAccountsPreserved:true,privateFile:file,verifiedBackup:backup,newAccounts:manifest.accounts.slice(8)};
 fs.writeFileSync(dir+'/accounts-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.error('Account extension stopped; inspect local files without printing secrets.');process.exitCode=1;}).finally(()=>{if(release)release();});
