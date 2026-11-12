const path=require('node:path');
const {readFileSync}=require('node:fs');
const {createRequire}=require('node:module');

// Match Next 16's standalone initialization. The parent supplies a previously
// owned port, or zero to let the OS allocate one. No HTTP probe runs before bind.
async function start(){
 const dir=path.resolve(process.argv[2]);
 process.chdir(dir);
 const requireWeb=createRequire(path.join(dir,'server.js'));
 const {config}=JSON.parse(readFileSync(path.join(dir,'.next','required-server-files.json'),'utf8'));
 process.env.__NEXT_PRIVATE_STANDALONE_CONFIG=JSON.stringify(config);
 requireWeb('next');
 const {startServer}=requireWeb('next/dist/server/lib/start-server');
 const preferred=Number(process.env.PORT);
 if(!Number.isInteger(preferred)||preferred<0||preferred>65535)throw Error('invalid_runtime_port');
 await startServer({dir,isDev:false,config,hostname:'127.0.0.1',port:preferred,allowRetry:false});
 const port=Number(process.env.PORT);
 const login=await fetch('http://127.0.0.1:'+port+'/login',{redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(login.status!==200)throw Error('runtime_login_unavailable');
 await login.body?.cancel();
 const message={kind:'ready',port};
 if(process.parentPort)process.parentPort.postMessage(message);
 else if(process.send)process.send(message);
 else throw Error('runtime_parent_missing');
}
process.on('disconnect',()=>process.exit(0));
process.parentPort?.on('close',()=>process.exit(0));
start().catch(()=>process.exit(1));
