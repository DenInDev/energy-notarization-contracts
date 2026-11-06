const hre = require('hardhat');
const fs = require('node:fs');
const {HDNodeWallet, Wallet, formatEther, formatUnits} = require('ethers');
const config = hre.config.networks.sepolia;
const manifest = JSON.parse(fs.readFileSync('.benchmark-accounts/addresses.json', 'utf8'));
let owner, ownerAddressSource='configured signer';
try { owner = Array.isArray(config.accounts) ? new Wallet(config.accounts[0]).address :
  HDNodeWallet.fromPhrase(config.accounts.mnemonic, undefined, "m/44'/60'/0'/0/0").address; }
catch { owner='0x940a5ca24aFe2b971f91FBF9112CafDCe0A73F6B'; ownerAddressSource='public address in previous Sepolia campaign output; signer configuration needs validation before experiments'; }
const addresses = [{id:'owner',address:owner}, ...manifest.accounts];
const calls = [{method:'eth_chainId',params:[]}, {method:'eth_gasPrice',params:[]},
  ...addresses.map(a=>({method:'eth_getBalance',params:[a.address,'latest']}))];
(async()=>{
  const response = await fetch(config.url,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(calls.map((x,i)=>({jsonrpc:'2.0',id:i+1,...x}))),signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok || !Array.isArray(result)) throw new Error('RPC inventory failed');
  const byId=Object.fromEntries(result.map(r=>[r.id,r]));
  if(result.some(r=>r.error) || BigInt(byId[1].result)!==11155111n) throw new Error('Invalid Sepolia response');
  const gasPrice=BigInt(byId[2].result);
  const report={at:new Date().toISOString(),chainId:11155111,ownerAddressSource,gasPriceWei:gasPrice.toString(),gasPriceGwei:formatUnits(gasPrice,'gwei'),
    accounts:addresses.map((a,i)=>({...a,balanceEth:formatEther(BigInt(byId[i+3].result))}))};
  fs.writeFileSync('logs/sepolia-funding-inventory.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.name==='TimeoutError'?'RPC inventory deadline exceeded':e.code||'RPC inventory failed');process.exitCode=1;});
