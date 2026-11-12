const {createServer}=require('node:http');
const next=require('next');
const hostname='127.0.0.1',port=Number(process.env.STAYCRAFT_DESKTOP_TEST_PORT||3190);
if(process.argv[2]!==hostname||process.env.STAYCRAFT_QA_DESKTOP_SYNC!=='1')throw Error('isolated_desktop_sample_only');
process.env.STAYCRAFT_SAMPLE_RICH ??= '1';
require('../scripts/qa-workspace-fixture.cjs');

const app=next({dev:true,hostname,port});
app.prepare().then(()=>{
 const server=createServer(app.getRequestHandler());
 server.on('error',error=>{console.error(error.message);process.exit(1)});
 server.listen(port,hostname,()=>console.log('Desktop sample is listening on http://127.0.0.1:'+port));
}).catch(error=>{console.error(error.message);process.exit(1)});
