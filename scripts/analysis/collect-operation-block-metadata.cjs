// Read-only block metadata collector. It never loads wallets or broadcasts.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
process.env.SEPOLIA_MNEMONIC = '';
process.env.HARDHAT_NETWORK = 'sepolia';
require('ts-node/register/transpile-only');
const hre = require('hardhat');
const {deadline} = require('../../tasks/lib/lifecycleTiming');
const {safeError} = require('../../tasks/lifecycle/errors');
const {installStudyRpcReadResilience}=require('../../tasks/studies/rpc');
const {verifyCanonicalReceipt} = require('../../tasks/studies/canonical');

async function main(file) {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const output = path.join(path.dirname(file), 'block-metadata.json');
  installStudyRpcReadResilience(hre.ethers.provider,path.join(path.dirname(file),'metadata-rpc-read-retries.jsonl'),20000,1000);
  if (fs.existsSync(output)) throw new Error('Use a fresh metadata output; preserve prior evidence');
  for (const d of plan.datasets) {
    if (createHash('sha256').update(fs.readFileSync(d.sourceReport)).digest('hex') !== d.sourceSha256)
      throw new Error('Source SHA256 changed');
  }
  if ((await deadline(() => hre.ethers.provider.getNetwork(), 20000, 'chain identity')).chainId !== 11155111n)
    throw new Error('Sepolia required');
  const allowed = new Set(['eth_getBlockByNumber', 'eth_getBlockByHash', 'eth_getTransactionReceipt', 'eth_getTransactionByHash']);
  const send = (method, params) => {
    if (!allowed.has(method)) throw new Error('Read-only collector rejected RPC method');
    return hre.ethers.provider.send(method, params);
  };
  const records = plan.datasets.flatMap(d => d.records.map((r, i) => ({dataset:d.id, index:i, ...r})))
    .filter(r => r.transaction.transactionHash && r.transaction.blockNumber !== null && r.transaction.blockNumber !== undefined);
  const groups = new Map();
  for (const r of records) {
    const n = r.transaction.blockNumber;
    if (!groups.has(n)) groups.set(n, []);
    groups.get(n).push(r);
  }
  const result = {schemaVersion:1, status:'running', startedAt:new Date().toISOString(), chainId:11155111,
    inputPlanSha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    sourceReports:plan.datasets.map(d=>({id:d.id,file:d.sourceReport,sha256:d.sourceSha256})),
    plannedUniqueBlockNumbers:groups.size, queriedOriginalBlockNumbers:0, blocks:{}, references:[], reconciliations:[], mutationCalls:0};
  const save = () => fs.writeFileSync(output, JSON.stringify(result, null, 2)+'\n');
  const cache = new Map();
  const readBlock = async n => {
    if (!cache.has(n)) cache.set(n, (async()=>{
      let block;
      for(let attempt=0; attempt<3; attempt++) {
        try { block=await deadline(()=>send('eth_getBlockByNumber',[hre.ethers.toQuantity(n),false]),20000,'containing block metadata'); if(!block?.hash)throw new Error('Containing block unavailable'); break; }
        catch(error) { if(attempt===2)throw error; await new Promise(resolve=>setTimeout(resolve,1000*2**attempt)); }
      }
      const value={number:Number(BigInt(block.number)),hash:block.hash,timestamp:Number(BigInt(block.timestamp)),gasUsed:BigInt(block.gasUsed).toString(),gasLimit:BigInt(block.gasLimit).toString(),observedAt:new Date().toISOString(),method:'eth_getBlockByNumber'};
      result.blocks[value.hash]=value;return value;
    })());
    return cache.get(n);
  };
  save();
  const entries=[...groups.entries()];
  for(let start=0;start<entries.length;start+=4) {
    await Promise.all(entries.slice(start,start+4).map(async([number,rows])=>{
      const block=await readBlock(number);
      for(const r of rows) {
        let chosen=block;
        if(r.transaction.blockHash!==block.hash) {
          const recovery=await verifyCanonicalReceipt(r.transaction,r.target,11155111,send,20000);
          if(!recovery)throw new Error('Block mismatch lacks reconciliation evidence');
          result.reconciliations.push({dataset:r.dataset,index:r.index,...recovery});
          chosen=await readBlock(recovery.canonical.blockNumber);
          if(chosen.hash!==recovery.canonical.blockHash)throw new Error('Reconciled block changed');
        }
        result.references.push({dataset:r.dataset,index:r.index,transactionHash:r.transaction.transactionHash,recordedBlockHash:r.transaction.blockHash,canonicalBlockHash:chosen.hash,canonicalBlockNumber:chosen.number});
      }
      result.queriedOriginalBlockNumbers++;
    }));
    if(start%100===0){save();console.log(JSON.stringify({blocks:result.queriedOriginalBlockNumbers,total:groups.size,reconciliations:result.reconciliations.length}));}
  }
  const finalized=await deadline(()=>send('eth_getBlockByNumber',['finalized',false]),20000,'finalized metadata checkpoint');
  result.finalizedBlock=Number(BigInt(finalized.number));
  result.allContainingBlocksFinalized=Object.values(result.blocks).every(b=>b.number<=result.finalizedBlock);
  result.status='finished';result.completedAt=new Date().toISOString();save();
  console.log(JSON.stringify({output,uniqueBlocks:Object.keys(result.blocks).length,transactions:result.references.length,reconciliations:result.reconciliations.length,allFinalized:result.allContainingBlocksFinalized}));
}
main(process.argv[2]).catch(error=>{console.error(safeError(error));process.exitCode=1;});
