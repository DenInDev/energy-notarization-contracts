require('ts-node/register');
const fs=require('fs'),path=require('path');
const {Interface,Transaction,toBeHex,keccak256,formatEther}=require('ethers');
const adapters=require('../../tasks/lifecycle/adapters');
const {startLifecycleWorker}=require('../../tasks/lifecycle/processWorker');
let platform,folder,owner,nonce=0,last=0n,total=0n,result=0n,address,resume;
const receipts=new Map();const hash=toBeHex(999,32);
process.on('message',m=>{if(m.command==='initialize'){
  platform=m.args.platform;folder=path.dirname(m.args.accountsFile);owner=m.args.ownerAddress;resume=m.args.resume;
  if(resume){nonce=resume.nextNonce;address=resume.setup.address;last=BigInt(resume.model.last);
    total=BigInt(resume.model.total);result=BigInt(resume.model.result);receipts.set(resume.lastSample.transactionHash,resume.receipt);}
}});
const abi=new Interface(['function addEnergyEntry(uint16 value)','function addLastEntryToEncryptedTotal()',
  'function multiplyLastEntryByConstant(uint64 value)','function meanLastEntryAndEncryptedTotal()',
  'function maxLastEntryAndEncryptedTotal()','function getLastEntryValue() view returns(uint256)',
  'function getEncryptedTotalHandle() view returns(uint256)','function getLastResult() view returns(uint256)']);
adapters.makeAdapter=async()=>({encrypt:async(value,trace)=>{
  await trace.span('encrypt.mock_cpu',()=>{const until=Date.now()+(platform==='baseline'?0:250);while(Date.now()<until){};});
  return [value];
},decrypt:async value=>BigInt(value)});
const receipt=(transactionHash)=>({transactionHash,status:'0x1',blockNumber:'0x3e8',blockHash:hash,gasUsed:'0x5208',effectiveGasPrice:'0x14'});
const contract={getAddress:async()=>address,interface:abi,get target(){return address;},
  getFunction:name=>({populateTransaction:async(...args)=>{
    if(platform==='zama'&&fs.existsSync(path.join(folder,'fail-prepare')))throw Error('Injected preparation failure');
    return {to:address,data:abi.encodeFunctionData(name,args)};
  }}),deploymentTransaction:()=>({hash:toBeHex(1,32),wait:async()=>({status:1,blockNumber:1000,blockHash:hash,gasUsed:100n,gasPrice:20n})})};
const provider={getNetwork:async()=>({chainId:11155111n}),getBalance:async()=>1n,estimateGas:async()=>21000n,
  getBlock:async()=>({timestamp:Math.floor(Date.now()/1000),gasUsed:100n,gasLimit:1000n}),send:async(method,params)=>{
    if(method==='eth_getTransactionCount')return toBeHex(nonce+(resume&&platform==='zama'&&fs.existsSync(path.join(folder,'fail-resume-nonce'))?1:0));
    if(method==='eth_getCode')return resume&&platform==='zama'&&fs.existsSync(path.join(folder,'fail-resume-code'))?'0x6001':'0x6000';
    if(method==='eth_getBlockByNumber')return {hash,number:'0x3e8',timestamp:'0x1',gasUsed:'0x64',gasLimit:'0x3e8'};
    if(method==='eth_getTransactionByHash'&&resume)return {hash:resume.lastSample.transactionHash,nonce:toBeHex(resume.lastSample.transactionNonce),from:owner,to:address};
    if(method==='eth_sendRawTransaction'){
      const tx=Transaction.from(params[0]);if(tx.nonce!==nonce++)throw Error('Nonce mismatch');
      const parsed=abi.parseTransaction({data:tx.data});
      if(parsed.name==='addEnergyEntry')last=parsed.args[0];
      else if(parsed.name==='addLastEntryToEncryptedTotal')total+=last;
      else if(parsed.name==='multiplyLastEntryByConstant')result=last*parsed.args[0];
      else if(parsed.name==='meanLastEntryAndEncryptedTotal')result=(last+total)/2n;
      else if(parsed.name==='maxLastEntryAndEncryptedTotal')result=last>total?last:total;
      fs.appendFileSync(path.join(folder,`sent-${platform}.jsonl`),JSON.stringify({nonce:tx.nonce,at:Date.now(),hash:tx.hash})+'\n');
      receipts.set(tx.hash,receipt(tx.hash));return tx.hash;
    }
    if(method==='eth_getTransactionReceipt')return receipts.get(params[0])||null;
    if(method==='eth_call'){
      if(params[1].blockHash!==hash||params[1].requireCanonical!==true)throw Error('Unpinned result');
      const getter=abi.parseTransaction({data:params[0].data}).name;
      const value=getter==='getLastEntryValue'?last:getter==='getEncryptedTotalHandle'?total:result;
      return abi.encodeFunctionResult(getter,[value+(resume&&platform==='zama'&&fs.existsSync(path.join(folder,'fail-resume-state'))?1n:0n)]);
    }
    throw Error('Unexpected RPC method');
  }};
startLifecycleWorker({ethers:{provider,toBeHex,keccak256,formatEther,getContractAt:async()=>contract,getContractFactory:async(name,signer)=>{
  owner=signer.address;address=toBeHex({EnergyNotarizationPlainTest:1,EnergyNotarizationFHETest:2,EnergyLifecycleCoFHE:3}[name],20);
  return {deploy:async({nonce:reserved})=>{if(reserved!==nonce++)throw Error('Deployment nonce mismatch');return contract;}};
}}},(method,params)=>provider.send(method,params));
