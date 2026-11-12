// Run the actual component effects with deterministic hooks, time and API fixtures.
// This checks request/state lifecycles; rendered browser acceptance is separate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const file=path.resolve(__dirname,'../src/components/desktop-first-run.tsx');
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText;
const progressKey=scope=>'staycraft-desktop-guide-v1:'+scope;
const saved={skipped:[],reviewed:false,paused:false,finished:false,promotionHelpClosed:false};
const fixtures={
 profile:{profile:{name:'Fixture property',location:'Fixture address'}},
 inventory:{inventory:{types:[{id:'type',price:300}],rooms:[{active:true,typeId:'type'}]}},
 'booking-import?view=state':{batches:[{}]},
 'market/sample':{snapshot:{locationStatus:'matched'},sample:{stats:{n:3}}},
 promotion:{state:{drafts:[{kind:'copy'}]}},
};
function clock(){
 let now=0,id=0;
 const timers=new Map();
 return {
  timers,
  setTimeout(fn,ms=0){const token=++id;timers.set(token,{fn,at:now+ms});return token},
  clearTimeout(token){timers.delete(token)},
  advance(ms){
   const target=now+ms;
   for(;;){const next=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}
   now=target;
  },
 };
}
function walk(node){
 if(node==null||typeof node==='boolean')return [];
 if(Array.isArray(node))return node.flatMap(walk);
 if(typeof node!=='object')return [node];
 return [node,...walk(node.props?.children)];
}
function text(node){return walk(node).filter(value=>typeof value==='string'||typeof value==='number').join(' ')}
function harness({scope='a:property-a',section='home',storage=new Map(),modes={},desktop=true}={}){
 const timer=clock(),window=new EventTarget(),hooks=[],requests=[],deferred=[];
 if(desktop)window.staycraftDesktop={};
 window.setTimeout=timer.setTimeout;window.clearTimeout=timer.clearTimeout;
 window.location={hash:''};
 let cursor=0,pendingEffects=[],dirty=false,mounted=true,tree,updatesAfterUnmount=0;
 const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
 const react={
  useState(initial){
   const index=cursor++;
   if(!hooks[index])hooks[index]={value:typeof initial==='function'?initial():initial};
   return [hooks[index].value,value=>{if(!mounted){updatesAfterUnmount++;return}const next=typeof value==='function'?value(hooks[index].value):value;if(!Object.is(next,hooks[index].value)){hooks[index].value=next;dirty=true}}];
  },
  useEffect(effect,deps){
   const index=cursor++,previous=hooks[index];
   if(!previous||deps.some((value,i)=>!Object.is(value,previous.deps[i]))){pendingEffects.push(()=>{previous?.cleanup?.();hooks[index]={deps,cleanup:effect()}});}
  },
 };
 const fetch=async(url,{signal})=>{
  const endpoint=url.replace('/api/workspace/','');
  requests.push({endpoint,signal});
  const mode=modes[endpoint]??'ok';
  const payload=mode&&typeof mode==='object'?mode:fixtures[endpoint];
  const response={ok:mode!=='error',json:async()=>payload};
  if(mode==='hang')return new Promise((_resolve,reject)=>{
   const cancel=()=>reject(signal.reason);
   if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true});
  });
  if(mode==='late')return new Promise(resolve=>deferred.push(()=>resolve(response)));
  if(mode==='body-hang')return {...response,json:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))};
  return response;
 };
 const module={exports:{}};
 const jsx=(type,props)=>({type,props});
 vm.runInNewContext(compiled,{
  module,exports:module.exports,
  require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx,Fragment:'fragment'}:name==='next/link'?{default:'a'}:{},
  window,localStorage,fetch,AbortController,AbortSignal,Intl,Date,console,
 },{filename:file});
 function render(){cursor=0;dirty=false;pendingEffects=[];tree=module.exports.DesktopFirstRun({scope,section,zh:true,onRooms(){}});pendingEffects.forEach(effect=>effect());}
 render();
 return {
  timer,requests,deferred,modes,storage,window,
  get tree(){return tree},get updatesAfterUnmount(){return updatesAfterUnmount},
  async settle(){for(let i=0;i<30;i++){await Promise.resolve();if(dirty&&mounted)render();}},
  async advance(ms){timer.advance(ms);await this.settle()},
  async focus(){window.dispatchEvent(new Event('focus'));await this.settle()},
  button(label){return walk(tree).find(node=>node?.type==='button'&&text(node)===label)},
  async click(label){const button=this.button(label);assert(button,'button exists: '+label);assert(!button.props.disabled,'button enabled: '+label);button.props.onClick();await this.settle()},
  unmount(){mounted=false;hooks.forEach(hook=>hook.cleanup?.())},
 };
}
(async()=>{
 // Paused/finished preferences must not wait for even the first network result.
 const pausedStorage=new Map([[progressKey('a:property-a'),JSON.stringify({...saved,paused:true})]]);
 const paused=harness({storage:pausedStorage,modes:Object.fromEntries(Object.keys(fixtures).map(key=>[key,'hang']))});
 await paused.advance(0);
 assert(paused.button('继续首次使用引导'));
 assert.equal(paused.requests.length,5);
 assert(!paused.requests.some(request=>request.signal.aborted));
 paused.unmount();await paused.settle();
 assert(paused.requests.every(request=>request.signal.aborted));
 assert.equal(paused.timer.timers.size,0,'unmount removes deadline and restoration timers');
 assert.equal(paused.updatesAfterUnmount,0,'aborted reads never write unmounted state');
 const count=paused.requests.length;await paused.focus();assert.equal(paused.requests.length,count,'unmount removes focus listener');

 const completeStorage=new Map([[progressKey('a:property-a'),JSON.stringify({...saved,finished:true,promotionHelpClosed:true})]]);
 const complete=harness({storage:completeStorage,modes:{profile:'hang'}});await complete.advance(0);
 assert.equal(text(complete.tree),'','finished guide stays hidden before API completion');complete.unmount();

 // Missing responses stay unknown; they are never called incomplete or skipped.
 const unknown=harness({modes:{'market/sample':'body-hang'}});await unknown.advance(0);
 assert(text(unknown.tree).includes('正在核对'));
 assert(unknown.button('重新核对').props.disabled);
 await unknown.advance(7999);assert(unknown.button('重新核对').props.disabled);
 await unknown.advance(1);
 assert(text(unknown.tree).includes('第 3 步'));
 assert(text(unknown.tree).includes('暂时无法核对'));
 assert(!unknown.button('跳过这一步'));
 assert(!unknown.button('重新核对').props.disabled);
 assert(unknown.requests.every(request=>request.signal.aborted),'deadline aborts the in-flight fetch/body signal');
 unknown.modes['market/sample']='ok';await unknown.click('重新核对');await unknown.advance(0);
 assert(text(unknown.tree).includes('第 4 步'),'retry resumes at diagnosis after verified setup');
 assert(unknown.button('已查看诊断'));

 // Failed refreshes cannot erase known completed steps or close progress early.
 Object.keys(fixtures).forEach(key=>unknown.modes[key]='error');await unknown.focus();
 assert(text(unknown.tree).includes('第 4 步'),'HTTP failures preserve successful checks');
 Object.keys(fixtures).forEach(key=>unknown.modes[key]='hang');await unknown.focus();await unknown.advance(8000);
 assert(text(unknown.tree).includes('第 4 步'),'timeouts preserve successful checks');unknown.unmount();

 // A superseded refresh may resolve after a fresh one; it must not overwrite it.
 const stale=harness({modes:{profile:'late'}});await stale.advance(0);
 const oldRequests=[...stale.requests];
 stale.modes.profile={profile:null};await stale.focus();
 assert(oldRequests.every(request=>request.signal.aborted),'focus cancels previous refresh');
 assert(text(stale.tree).includes('完善民宿资料'));
 stale.deferred.forEach(resolve=>resolve());await stale.settle();
 assert(text(stale.tree).includes('完善民宿资料'),'late stale success cannot skip property setup');
 assert.equal(stale.timer.timers.size,0,'successful and superseded reads release timers');stale.unmount();

 // Scope remains keyed by account/property; browser-only demo has no guide/API reads.
 const other=harness({scope:'b:property-b',storage:completeStorage});await other.advance(0);
 assert(other.button('已查看诊断'),'account B does not inherit account A completion');
 assert.equal(JSON.parse(completeStorage.get(progressKey('a:property-a'))).finished,true);
 other.unmount();
 const web=harness({desktop:false});await web.advance(8000);assert.equal(web.tree,null);assert.equal(web.requests.length,0);web.unmount();
 const early=harness();early.unmount();await early.advance(8000);assert.equal(early.requests.length,0,'unmount before restoration starts no requests');
 console.log('PASS desktop first run: immediate saved pause/finish restoration, 8s request/body deadline, unknown-state retry, retained successful steps, focus supersession, stale response/unmount cancellation, timer cleanup, account/property isolation and web exclusion. Mock APIs only.');
})().catch(error=>{console.error(error);process.exitCode=1});
