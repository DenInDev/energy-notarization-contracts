// Resume a settled matched uniform prefix, then finish only the unstarted width.
// No new deployment/warmup for the interrupted stage and no transaction replay.
process.env.SEPOLIA_MNEMONIC='';
process.env.HARDHAT_NETWORK='sepolia';
require('ts-node/register');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const hre=require('hardhat');
const {continueLifecycleCampaign}=require('../tasks/lifecycle/continuation');
const {writeLifecycleJson}=require('../tasks/lib/lifecycleReportWrite');
const {safeError}=require('../tasks/lifecycle/errors');
const root=path.resolve(process.argv[2]),accountsFile=path.resolve(process.argv[3]);
const parentFile=path.join(root,'campaign.json'),file=path.join(root,'campaign-continuation1.json');
const hash=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let manifest;
const save=()=>{
  writeLifecycleJson(file,manifest);
  writeLifecycleJson(path.resolve('logs/energy-active-campaign.json'),{pid:process.pid,status:manifest.status,startedAt:manifest.startedAt,
    manifest:file,currentStage:manifest.currentStage,report:manifest.currentReport,accountsFile,runs:manifest.runs,widths:manifest.widths,
    command:'node scripts/resume-uniform-energy.cjs'});
};
function validate(report){
  const measured=report.samples.filter(s=>!s.warmup),views=report.viewDecryptSamples;
  if(report.schemaVersion!==14||!report.complete||measured.length!==report.runs*18||
    new Set(measured.map(s=>`${s.platform}/${s.run}/${s.operation}`)).size!==measured.length||
    report.samples.filter(s=>s.warmup).length!==18||report.samples.some(s=>s.status!=='ok')||report.setup.length!==3||
    views.length!==3*(report.runs+1)||views.some(s=>s.status!=='ok'))throw Error('Retained uniform report failed completion validation');
}
async function main(){
  if(fs.existsSync(file))throw Error('Continuation manifest already exists; do not replay');
  const parent=JSON.parse(fs.readFileSync(parentFile)),failed=parent.stages.at(-1),source=JSON.parse(fs.readFileSync(failed.report));
  if(parent.status!=='failed'||failed.kind!=='measured'||failed.width!==16||source.samples.some(s=>s.status!=='ok')||
    !/^Report persistence failed/.test(source.error||'')||path.resolve(parent.accountsFile)!==accountsFile||parent.runs!==50)
    throw Error('Only the reviewed all-valid persistence checkpoint can resume');
  const snapshots=Object.fromEntries(Object.keys(source.sourceSha256).map(f=>[f,hash(f)]));
  snapshots['scripts/resume-uniform-energy.cjs']=hash(__filename);
  const allowed=new Set(['tasks/lib/lifecycleReportWrite.ts','tasks/lifecycle/report.ts','tasks/lifecycle/processCampaign.ts',
    'tasks/lifecycle/processContinuation.ts','tasks/lifecycle/continuation.ts']);
  const changes=Object.entries(source.sourceSha256).filter(([f,h])=>snapshots[f]!==h);
  if(changes.some(([f])=>!allowed.has(f)))throw Error('Timed workload/dependency changed');
  for(const p of parent.stages.filter(s=>s.status==='finished'))validate(JSON.parse(fs.readFileSync(p.report)));
  manifest={...parent,status:'preflight',pid:process.pid,startedAt:new Date().toISOString(),parentManifest:{file:parentFile,sha256:hash(parentFile)},
    sourceCheckpoint:{file:failed.report,sha256:hash(failed.report)},sourceSnapshot:snapshots,
    changedPersistenceOrchestrationFiles:changes.map(([f,h])=>({file:f,previousSha256:h,currentSha256:snapshots[f]})),
    historicalOrchestrationError:parent.error,stages:parent.stages.map(s=>({...s}))};
  delete manifest.error;delete manifest.abortedAt;
  save();
  for(const width of [16,128]){
    for(const [f,h] of Object.entries(snapshots))if(hash(f)!==h)throw Error('Source changed between rerun stages');
    const output=path.join(root,width===16?'measured-euint16-continuation1':'measured-euint128');
    if(fs.existsSync(output))throw Error('Fresh stage output required');
    const stage={kind:'measured',width,status:'running',startedAt:new Date().toISOString(),report:path.join(output,'report.json'),
      ...(width===16?{continuationFrom:failed.report,sourceReportSha256:hash(failed.report)}:{})};
    manifest.stages.push(stage);manifest.currentStage=`measured-euint${width}${width===16?'-continuation1':''}`;
    manifest.currentReport=stage.report;manifest.status='running';save();
    if(width===16)await continueLifecycleCampaign({report:failed.report,outputDir:output,accountsFile,resumeUniformAll:true},hre);
    else await hre.run('benchmark:energy:lifecycle',{runs:50,width,platform:'all',seed:source.scheduleSeed,timeout:180,setupTimeout:180,accountsFile,outputDir:output,execution:'processes'});
    const report=JSON.parse(fs.readFileSync(stage.report));validate(report);
    stage.status='finished';stage.completedAt=new Date().toISOString();stage.rawSha256=hash(stage.report);save();
  }
  manifest.status='complete_segmented_after_persistence_failure';manifest.completedAt=new Date().toISOString();save();
}
main().catch(error=>{
  if(manifest){manifest.status='failed';manifest.error=safeError(error);manifest.abortedAt=new Date().toISOString();const s=manifest.stages.at(-1);if(s.status==='running')s.status='failed';save();}
  console.error(safeError(error));process.exitCode=1;
});
