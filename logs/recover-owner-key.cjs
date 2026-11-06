const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {Wallet,HDNodeWallet,Mnemonic}=require('ethers');
const target='0x940a5ca24afe2b971f91fbf9112caf dce0a73f6b'.replace(/ /g,'');
const files=new Set(),seen=new Set();let checkedKeys=0,checkedPhrases=0,found=null;
function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isSymbolicLink())continue;const p=path.join(dir,e.name);if(e.isDirectory()){if(!['node_modules','.git','.venv','artifacts','cache','fhevmTemp'].includes(e.name))walk(p);}else if(/\.(json|jsonl|txt|ts|js|cjs|toml|env|bak|backup)$/i.test(e.name)||e.name.startsWith('.env'))files.add(p);}}
walk(process.cwd());walk('C:/Users/danie/AppData/Roaming/hardhat-nodejs');walk('C:/Users/danie/AppData/Roaming/Microsoft/Windows/PowerShell/PSReadLine');
for(const p of fs.readFileSync('logs/owner-recovery-source-files.txt','utf8').replace(/^\uFEFF/,'').split(/\r?\n/))if(p.trim())files.add(p.trim());
function key(s,source){if(seen.has('k'+s))return;seen.add('k'+s);try{const w=new Wallet(s);checkedKeys++;if(w.address.toLowerCase()===target)found={wallet:w,source};}catch{}}
function phrase(s,source){s=s.trim().toLowerCase().replace(/\s+/g,' ');if(seen.has('m'+s))return;seen.add('m'+s);if(!Mnemonic.isValidMnemonic(s))return;checkedPhrases++;try{const root=HDNodeWallet.fromPhrase(s);for(let i=0;i<20;i++){const w=i===0?root:HDNodeWallet.fromPhrase(s,undefined,`m/44'/60'/0'/0/${i}`);if(w.address.toLowerCase()===target){found={wallet:w,source};break;}}}catch{}}
function scan(text,source){for(const m of text.matchAll(/(?:0x)?\b[a-fA-F0-9]{64}\b/g))key(m[0],source);for(const run of text.matchAll(/\b[a-z]+(?:[ \t]+[a-z]+){11,23}\b/g)){const words=run[0].split(/\s+/);for(const n of [12,15,18,21,24])for(let i=0;i+n<=words.length;i++)phrase(words.slice(i,i+n).join(' '),source);}if(text.trim().startsWith('{')){try{const recurse=v=>{if(typeof v==='string'){if(/^[a-z]+(?:\s+[a-z]+){11,23}$/.test(v.trim()))phrase(v,source);}else if(v&&typeof v==='object')Object.values(v).forEach(recurse);};recurse(JSON.parse(text));}catch{}}}
for(const p of fs.readFileSync('logs/owner-recovery-backup-files.txt','utf8').replace(/^\uFEFF/,'').split(/\r?\n/))if(p.trim())files.add(p.trim());
for(const file of files){try{if(fs.statSync(file).size<50000000)scan(fs.readFileSync(file,'utf8'),file);}catch{}if(found)break;}
if(!found){try{scan(cp.execFileSync('git',['log','--all','-p','--','.env','hardhat.config.ts'],{encoding:'utf8',maxBuffer:5000000}),'git history: configuration');}catch{}}
if(found){const dest='.benchmark-accounts/recovered-owner.secret.json';fs.writeFileSync(dest,JSON.stringify({chainId:11155111,address:found.wallet.address,privateKey:found.wallet.privateKey},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({status:'recovered',address:found.wallet.address,file:dest,source:found.source}));}
else console.log(JSON.stringify({status:'no-matching-key-found',filesScanned:files.size,uniquePrivateKeysChecked:checkedKeys,validMnemonicsChecked:checkedPhrases}));

