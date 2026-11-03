// Real separate-process fixture: simulate a CPU-bound proof before IPC readiness.
let readyAt;
process.on('message', async ({id,command,args}) => {
  if(command==='prepare') {
    const start=Date.now(); while(Date.now()-start<(args.cpuMs||0)) {}
    readyAt=Date.now(); process.send({type:'response',id,result:{pid:process.pid,readyAt}});
  } else if(command==='execute') {
    if(!readyAt) throw Error('Not prepared');
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,args.releaseAt-Date.now())));
    process.send({type:'response',id,result:{pid:process.pid,readyAt,broadcastAt:Date.now()}});
  } else if(command==='shutdown') {
    process.send({type:'response',id,result:true},()=>process.disconnect());
  } else if(command==='crash') process.exit(7);
});
