// Real-mode desktop dispatch with a stub child process and sync endpoint. No browser/network.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
const a={userId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',propertyId:'11111111-1111-4111-8111-111111111111'};
const b={userId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',propertyId:'22222222-2222-4222-8222-222222222222'};
const dates=['2026-11-13','2026-11-14'];
const calendarInput='https://hotels.ctrip.com/hotels/123.html 隔离测试住宿';
const json=(file,value)=>fs.writeFileSync(file,JSON.stringify(value));
async function setup(scenario='calendar'){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'staycraft-calendar-dispatch-'));
 const handlers=new Map(),calls=[],posts=[];let account=a,instance,ready;
 const base=identity=>path.join(temp,'collections',identity.userId,identity.propertyId);
 for(const [identity,scope] of [[a,'member:00000000-0000-4000-8000-000000000001'],[b,'member:00000000-0000-4000-8000-000000000002']]){fs.mkdirSync(base(identity),{recursive:true});json(path.join(base(identity),'session.json'),{scope});}
 class Window{
  constructor(){instance=this;this.webContents={mainFrame:{},session:{fetch:async(url,options)=>{
   assert.equal(url,'http://127.0.0.1:3309/api/workspace/market/sync');
   if(options?.method==='POST'){const body=JSON.parse(options.body);posts.push(body);return {ok:true,status:201,json:async()=>({status:'saved',batch:{id:'isolated-batch'}})};}
   return {ok:true,json:async()=>({...account})};
  }},on(){},setWindowOpenHandler(){}};}
  loadURL(){return Promise.resolve();}
 }
 const app={isPackaged:false,setName(){},getPath:()=>temp,setPath(){},whenReady:()=>({then:fn=>{ready=Promise.resolve().then(fn)}}),requestSingleInstanceLock:()=>true,on(){},quit(){}};
 const spawn=(node,args,options)=>{
  const script=path.basename(args[0]);calls.push({script,args:args.slice(1),options});
  assert.equal(options.windowsHide,true);assert.equal(options.env.STAYCRAFT_PRICE_PROFILE,path.join(base(account),'browser-profile'));
  assert(options.cwd.startsWith(path.join(base(account),'runs')+path.sep));
  const child=new EventEmitter();child.kill=()=>{};
  queueMicrotask(()=>{
   if(script==='collect-public-prices.mjs'){
    assert.deepEqual(Array.from(args.slice(1)),['--collect-public-prices','123']);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(options.cwd,'homestays.json'),'utf8')),[{id:'123',name:'隔离测试住宿'}]);
    const session=JSON.parse(fs.readFileSync(path.join(options.cwd,'session.json'),'utf8'));
    assert.equal(session.scope,JSON.parse(fs.readFileSync(path.join(base(account),'session.json'),'utf8')).scope);
    const observed=dates.map(stayDate=>({hotelId:'123',hotelName:'隔离测试住宿',sourceUrl:'https://hotels.ctrip.com/hotels/123.html',authScope:session.scope,capturedAt:'2026-11-12T08:00:00Z',stayDate,amount:330,currency:'CNY',kind:'calendar_reference',status:'observed',rooms:1,adults:2,children:0,nights:1}));
    json(path.join(options.cwd,'history.json'),observed);
    json(path.join(options.cwd,'job.json'),{dates,status:scenario==='barrier'?'failed':'succeeded',results:[{hotelId:'123',status:scenario==='barrier'?'unavailable':'succeeded',error:scenario==='barrier'?'verification_required':null}]});
   }else{
    assert.equal(script,'collect-ctrip-list-prices.mjs');
    json(args[2],{status:'complete',dates,days:dates.map(date=>({date,capturedAt:'2026-11-12T08:00:00Z',occupancy:'1间, 1成人, 0儿童',rows:[{name:'展示起价住宿',priceCny:199}]}))});
   }
   if(scenario==='switch')account=b;
   child.emit('exit',0);
  });return child;
 };
 const mocks={electron:{app,BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},shell:{openExternal(){throw Error('unexpected_external_navigation')}}},'node:child_process':{spawn}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8'),{require:name=>mocks[name]||require(name),__dirname:path.join(root,'desktop'),process:{argv:[],execPath:process.execPath,env:{STAYCRAFT_DESKTOP_TEST_DATA:temp,STAYCRAFT_DESKTOP_TEST_PORT:'3309',STAYCRAFT_DESKTOP_NODE:process.execPath}},URL,console},{filename:'desktop/main.cjs'});
 await ready;
 const invoke=input=>{const frame=instance.webContents.mainFrame;frame.url='http://127.0.0.1:3309/app';return handlers.get('staycraft:collect')({sender:instance.webContents,senderFrame:frame},input)};
 return {invoke,calls,posts,switchTo:value=>account=value,base};
}
(async()=>{
 const calendar=await setup();let result=await calendar.invoke(calendarInput);assert.equal(result.state,'saved');assert.equal(result.observed,2);assert.equal(result.missing,0);assert.equal(calendar.calls[0].script,'collect-public-prices.mjs');assert.deepEqual(calendar.posts[0].observations.map(o=>o.kind),['calendar_reference','calendar_reference']);assert(calendar.posts[0].observations.every(o=>!Object.hasOwn(o,'authScope')));assert.equal(calendar.posts[0].userId,a.userId);
 calendar.switchTo(b);result=await calendar.invoke(calendarInput);assert.equal(result.state,'saved');assert.equal(calendar.posts[1].userId,b.userId);assert.notEqual(calendar.calls[0].options.env.STAYCRAFT_PRICE_PROFILE,calendar.calls[1].options.env.STAYCRAFT_PRICE_PROFILE);
 const list=await setup('list');assert.equal((await list.invoke('https://hotels.ctrip.com/hotels/list?city=654')).state,'saved');assert.equal(list.calls[0].script,'collect-ctrip-list-prices.mjs');assert(list.posts[0].observations.every(o=>o.kind==='display_starting_price'&&o.adults===1));
 const blocked=await setup('barrier');assert.equal((await blocked.invoke(calendarInput)).error,'verification_required');assert.equal(blocked.posts.length,0);
 const switched=await setup('switch');assert.equal((await switched.invoke(calendarInput)).error,'account_changed');assert.equal(switched.posts.length,0);
 const invalid=await setup();assert.equal((await invalid.invoke('https://evil.invalid/hotels/123.html name')).error,'invalid_hotels');assert.equal(invalid.calls.length,0);
 console.log('PASS real-mode calendar/list dispatch, scoped hotel/session inputs, two account profiles, public-field sync whitelist, validation barrier and account-switch block; stub process and endpoint only, no network.');
})().catch(error=>{console.error(error);process.exitCode=1});
