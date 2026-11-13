// Execute the native collection coordinator against temporary local files and a
// fake authenticated sync endpoint. No browser collection or cloud write.
const fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'staycraft-sync-recovery-'));
process.env.STAYCRAFT_DESKTOP_SAMPLE='1';process.env.STAYCRAFT_DESKTOP_TEST_DATA=temp;
const app={setName(){},getPath:()=>temp,setPath(){},whenReady:()=>({then:()=>({catch(){}})}),on(){},setAppUserModelId(){}};
const handlers=new Map();
const file=path.resolve(__dirname,'../desktop/main.cjs'),mod=new Module(file);mod.paths=module.paths;
mod.require=name=>name==='electron'?{app,ipcMain:{handle:(name,handler)=>handlers.set(name,handler)}}:require(Module.createRequire(file).resolve(name));
mod._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports={collect,sync,summary,collectionStatus,handle,setWindow:value=>window=value};',file);
const native=mod.exports,identity={userId:'11111111-1111-4111-8111-111111111111',propertyId:'22222222-2222-4222-8222-222222222222',location:'isolated fixture'};
let postWrites=0,checks=0,drop=true,saved;
native.setWindow({webContents:{session:{fetch:async(url,init)=>{
 if(!init?.method||init.method==='GET')return Response.json(identity);
 const body=JSON.parse(init.body);if(body.checkOnly){checks++;return Response.json(saved?{status:'already_saved',batch:{id:saved}}:{status:'not_saved'});}
 postWrites++;saved='33333333-3333-4333-8333-333333333333';if(drop){drop=false;throw Error('lost response after commit');}return Response.json({status:'saved',batch:{id:saved}});
}}}});
(async()=>{
 const base=path.join(temp,'isolated');await fsp.mkdir(base,{recursive:true});const latest=path.join(base,'latest.json');
 let result=await native.collect('https://hotels.ctrip.com/hotels/910001.html Fictional Stay',identity,base,latest);
 assert.equal(result.state,'pending');assert.equal(result.error,'sync_failed');assert.equal(result.observed,7);assert.equal(postWrites,1);
 result=await native.collect('INVALID INPUT MUST NOT RECOLLECT',identity,base,latest);
 assert.equal(result.state,'saved');assert.equal(result.syncStatus,'already_saved');assert.equal(postWrites,1);assert.equal(checks,2);assert.equal((await fsp.readdir(path.join(base,'runs'))).length,1);
 const state=await native.collectionStatus(base,latest);assert.equal(state.state,'saved');assert.equal(state.operation.phase,'refreshing');assert(state.completedAt);
 const pending=JSON.parse(await fsp.readFile(latest,'utf8'));identity.userId='44444444-4444-4444-8444-444444444444';await assert.rejects(native.sync(latest,pending),/account_changed/);assert.equal(postWrites,1);
 let releaseScope;const pendingScope=new Promise(resolve=>{releaseScope=resolve});
 const sender={mainFrame:{url:'http://127.0.0.1:3190/app/explore'},session:{fetch:async()=>{await pendingScope;return Response.json(identity)}}};native.setWindow({webContents:sender});
 let launches=0;native.handle('collect',async()=>{launches++;return {state:'saved'}});native.handle('cancel',async()=>({state:'idle'}));
 const event={sender,senderFrame:sender.mainFrame};const starting=handlers.get('staycraft:collect')(event,'fixture');
 const stopped=await handlers.get('staycraft:cancel')(event);assert.equal(stopped.operation.phase,'cancelled');releaseScope();assert.equal((await starting).operation.phase,'cancelled');assert.equal(launches,0,'cancel during account lookup must prevent browser launch');
 console.log('PASS native collection recovery: local batch retained after lost response, receipt checked before retry, no recollection/no duplicate save, timestamps and account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
