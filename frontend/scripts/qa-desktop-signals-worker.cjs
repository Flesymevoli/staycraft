const assert=require('node:assert/strict');
const path=require('node:path');
const Module=require('node:module');
const {readFile}=require('node:fs/promises');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..');
const USER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',PROPERTY='33333333-3333-4333-8333-333333333333';
const TOKEN='fixture.access.signature',OTHER_TOKEN='other.access.signature',LOCATION='江苏省苏州市太仓市上海东路98号';
const NOW=new Date('2026-11-12T04:00:00Z');
const initial={version:1,kind:'weather',propertyId:PROPERTY,location:LOCATION,start:'2026-11-12',days:7};
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++}
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
function harness(options={}){
 const calls=[],limits=[];let profiles=0;
 const env={SUPABASE_URL:'https://worker-fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',AMAP_MAPS_API_KEY:'private-map-fixture',
  AUTH_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.ipLimited}}},
  SIGNALS_RATE_LIMITER:{limit:async({key})=>{limits.push(key);return {success:!options.userLimited}}},...options.env};
 const fetcher=async(resource,init={})=>{
  const url=new URL(resource instanceof Request?resource.url:String(resource)),headers=new Headers(init.headers),method=init.method||'GET';
  calls.push({url,headers,method,redirect:init.redirect,cache:init.cache,body:init.body});
  if(options.hang)return new Promise(()=>{});
  if(url.origin===env.SUPABASE_URL){
   check(method==='GET','all database/auth access is read-only');
   check([`Bearer ${TOKEN}`,`Bearer ${OTHER_TOKEN}`].includes(headers.get('authorization')),'same authenticated JWT used for RLS');
   if(url.pathname==='/auth/v1/user')return options.invalidToken?json({msg:'invalid JWT',code:'bad_jwt'},401):json({id:headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?OTHER:USER,email:'fixture@example.test',aud:'authenticated',app_metadata:{},user_metadata:{},created_at:'2020-01-01T00:00:00Z'});
   if(url.pathname==='/rest/v1/properties'){
    check(url.searchParams.get('id')===`eq.${PROPERTY}`,'property filter pinned');
    check(url.searchParams.get('owner_user_id')===`eq.${headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?OTHER:USER}`,'ownership filter pinned');
    return json(options.foreignProperty||headers.get('authorization')===`Bearer ${OTHER_TOKEN}`?[]:[{id:PROPERTY}]);
   }
   if(url.pathname==='/rest/v1/property_details'){
    profiles++;
    check(url.searchParams.get('property_id')===`eq.${PROPERTY}`,'profile filter pinned');
    return json([{profile:{location:options.emptyLocation?'':options.changedLocation&&profiles>1?'另一个城市':options.location??LOCATION,checkoutTime:'11:00',futureUnknownField:{kept:true}}}]);
   }
   throw Error('Unexpected Supabase request');
  }
  if(url.origin==='https://api.deepseek.com'){
   check(url.href==='https://api.deepseek.com/v1/tools/search'&&method==='POST','only fixed official search endpoint; no chat/model endpoint');
   const key=env.SEARCH_API_KEY||(env.EVENT_SEARCH_ENABLED==='1'?env.DEEPSEEK_API_KEY:'');
   check(!!key&&headers.get('authorization')==='Bearer '+key,'search receives only its configured server credential');
   check(!headers.has('cookie')&&!headers.has('apikey'),'search receives no session cookie or unrelated API credential');
   const body=JSON.parse(init.body);
   check(body.need_content===true&&body.count===5,'search requests bounded full page content');
   check(body.query.startsWith(options.searchArea+' '),'search query uses administrative area');
   check(!body.query.includes(options.location)&&!body.query.includes('88号')&&!body.query.includes('私人民宿'),'property street number and name are not sent to search');
   check(!JSON.stringify({headers:[...headers],body}).includes(TOKEN)&&!JSON.stringify({headers:[...headers],body}).includes(env.AMAP_MAPS_API_KEY),'search receives neither account JWT nor private map key');
   check(!body.query.includes(USER)&&!body.query.includes(PROPERTY),'search receives no account or property identifiers');
   if(options.searchLimited)return json({error:'rate_limited'},429);
   const venue=options.venue||options.searchArea+'文化路12号';
   const fullPage=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'ExhibitionEvent',name:'通用搜索隔离测试展',startDate:'2026-11-13',endDate:'2026-11-18',location:{'@type':'Place',name:'测试文化馆',address:venue}})}</script>`;
   return json({results:[{title:'通用搜索隔离测试展',url:'https://events.example.org/'+encodeURIComponent(options.searchArea),snippet:'摘要与发布时间不是活动时间：2028-01-01。',date:'2028-01-01',rerank_score:2,content:fullPage,site_name:'隔离活动来源'}]});
  }
  check(!headers.has('authorization')&&!headers.has('cookie')&&!headers.has('apikey'),'credentials never reach map/weather/calendar providers');
  if(url.origin==='https://mcp.amap.com'){
   check(url.pathname==='/mcp'&&method==='POST','fixed geocoding endpoint');
   check(url.searchParams.get('key')===env.AMAP_MAPS_API_KEY,'explicit private binding used');
   const body=JSON.parse(init.body);check(body.params.name==='maps_geo','only geocoding capability');
   if(options.searchArea)check([options.location?.replace(/周边$/,''),options.venue||options.searchArea+'文化路12号'].includes(body.params.arguments.address),'geocoder receives property or extracted event venue only');
   if(options.mapRedirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
   if(options.mapOversize)return new Response('x'.repeat(262145));
   if(options.mapInvalid)return json({error:{message:'upstream private-map-fixture '+TOKEN}},500,{'set-cookie':'stolen=yes'});
   return json({jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:JSON.stringify({geocodes:[{location:options.badPoint?'not-a-coordinate':options.point??'121.133778,31.457266',...options.geocodeArea}]})}]}},200,{'set-cookie':'provider=private'});
  }
  if(['https://www.namoc.cn','https://www.zjam.org.cn'].includes(url.origin)){
   check(method==='GET','official calendars only use GET');check(init.credentials==='omit','calendar request explicitly omits credentials');
   check(url.href===(url.origin==='https://www.namoc.cn'?'https://www.namoc.cn/namoc/zhanlan/zl_list.shtml':'https://www.zjam.org.cn/Site/Exbition/ExbitionList.aspx?type=1'),'only fixed official calendar paths are requested');
   if(options.calendarRedirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
   if(options.calendarUnavailable)return new Response(null,{status:503});
   const html=url.origin==='https://www.namoc.cn'?`<ul id="zlhglb"><li><h3><a href="/namoc/zhanlan/202611/${'a'.repeat(32)}.shtml" title="隔离北京测试展">测试</a></h3><p>展览时间：2026-11-13至2026-11-20</p><p>展览场地：1号厅</p></li></ul>`
    :'<table id="dlExbition"><tr><td><a href="ExbitionDetail.aspx?etid=2918&amp;type=1" title="隔离杭州测试展"><h3>测试</h3></a><p>展览时间：2026/11/1 至 2026/11/21<br>展厅：1号厅<br>展览联系方式：000</p></td></tr></table>';
   return new Response(html.replace(/[^\x00-\x7F]/g,char=>'&#'+char.charCodeAt(0)+';'),{headers:{'Content-Type':'text/html','set-cookie':'provider=private'}});
  }
  if(url.origin==='https://api.open-meteo.com'){
   check(url.pathname==='/v1/forecast'&&method==='GET','fixed public weather endpoint');
   if(options.weatherRedirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.example'}});
   const n=Number(url.searchParams.get('forecast_days'));
   const time=Array.from({length:n},(_,i)=>new Date(Date.parse('2026-11-12')+i*86400000).toISOString().slice(0,10));
   return json({daily:{time,weather_code:time.map(()=>3),temperature_2m_min:time.map(()=>12),temperature_2m_max:time.map(()=>21),precipitation_probability_max:time.map(()=>30)}});
  }
  throw Error('Unmocked network access blocked');
 };
 return {env,fetcher,calls,limits};
}
function request(body=initial,options={}){
 return new Request(options.url||'https://staycraft.online/desktop-api/v1/signals',{method:options.method||'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${TOKEN}`,...options.headers},...(options.method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
async function main(){
 // No QA request is allowed to escape the injected in-memory fetch implementation.
 global.fetch=async()=>{throw Error('Live network prohibited in worker QA')};
 const compiled=await build({entryPoints:[path.join(root,'desktop-api/worker.ts')],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
 const loaded=new Module(path.join(__dirname,'worker-memory.cjs'));loaded.filename=path.join(__dirname,'worker-memory.cjs');loaded.paths=Module._nodeModulePaths(root);loaded._compile(compiled.outputFiles[0].text,loaded.filename);
 const {handleSignalsRequest}=loaded.exports;
 async function invoke(body=initial,options={},reqOptions={}){
  const state=harness(options);const response=await handleSignalsRequest(request(body,reqOptions),state.env,{fetcher:state.fetcher,now:()=>NOW,timeoutMs:options.timeoutMs??2000});
  const result=await response.json();
  check(!response.headers.has('set-cookie'),'no provider cookies forwarded');
  check(!JSON.stringify(result).includes(TOKEN)&&!JSON.stringify(result).includes('private-map-fixture'),'no credential in response');
  for(const key of [state.env.SEARCH_API_KEY,state.env.DEEPSEEK_API_KEY].filter(Boolean))check(!JSON.stringify(result).includes(key),'search credential never appears in returned events');
  for(const call of state.calls)check(call.redirect==='manual'&&call.cache==='no-store','private, nonredirecting upstream request');
  return {...state,response,result};
 }
 let result=await invoke();
 check(result.response.status===200&&result.result.days.length===7,'weather returns requested seven days');
 check(result.result.userId===USER&&result.result.propertyId===PROPERTY&&result.result.location===LOCATION,'scope is server verified');
 check(result.result.source.coverage.from==='2026-11-12'&&result.result.source.coverage.to==='2026-11-18'&&result.result.source.coverage.kind==='complete','coverage matches returned window');
 check(result.result.days.every(day=>day.source.coverage.to==='2026-11-18'),'daily evidence uses narrowed coverage');
 check(result.limits[1]===`desktop-signals:user:${USER}`,'verified user owns rate key');
 result=await invoke({...initial,location:' 江苏省 苏州市太仓市上海东路９８号 '});check(result.response.status===200,'NFKC and whitespace-normalized address accepts same location');
 result=await invoke({...initial,start:'2026-11-20',days:16});check(result.result.days.length===8&&result.result.source.coverage.kind==='partial'&&result.result.window.end==='2026-12-05','future window never relabels today forecast');
 const eventInput={version:1,kind:'events',propertyId:PROPERTY,location:LOCATION,start:'2026-11-12',end:'2026-11-18'};
 result=await invoke(eventInput);check(result.response.status===200&&result.result.events.length>0,'existing sourced event algorithm reused');
 check(result.calls.every(call=>call.url.origin!=='https://api.open-meteo.com'),'events do not call weather/model');
 check(result.result.events.every(event=>event.start<=eventInput.end&&event.end>=eventInput.start),'events overlap requested window');
 check(result.calls.every(call=>!['https://www.namoc.cn','https://www.zjam.org.cn'].includes(call.url.origin)),'Taicang is not mislabeled as live nationwide coverage');
 result=await invoke(eventInput,{point:'116.408939,39.925255'});check(result.response.status===200&&result.result.events.length===1&&result.result.events[0].id.startsWith('bj-namoc-'),'Beijing official calendar reaches the authenticated desktop response');
 check(result.result.source.observedAt===NOW.toISOString()&&result.result.source.coverage.kind==='partial','live source has current observation time but partial venue coverage');
 result=await invoke(eventInput,{point:'120.156894,30.231049'});check(result.response.status===200&&result.result.events.length===1&&result.result.events[0].id==='hz-zjam-2918','Hangzhou live list replaces the old snapshot, preserving stable identities');
 for(const failure of ['calendarUnavailable','calendarRedirect']){
  result=await invoke(eventInput,{point:'120.156894,30.231049',[failure]:true});check(result.response.status===200&&result.result.events.length===2,'official source failure keeps existing scoped records');
  check(result.result.source.observedAt==='2026-11-11T02:19:23.053Z'&&result.result.source.note.includes('保留原采集时间'),'failed refresh cannot claim fresh observations');
  check(result.calls.every(call=>call.url.origin!=='https://untrusted.example'),'calendar redirects are not followed');
 }
 // A city with no bespoke calendar still works through the shared search/extraction path.
 const generic=(district,extra={})=>({location:`广东省广州市${district}测试路88号私人民宿`,searchArea:`广东省广州市${district}`,point:'113.2800,23.1200',...extra});
 const shortAddress={location:'无锡惠山古镇周边',searchArea:'江苏省无锡市梁溪区',point:'120.27,31.58',geocodeArea:{province:'江苏省',city:'无锡市',district:'梁溪区'},env:{SEARCH_API_KEY:'short-address-fixture'}};
 result=await invoke({...eventInput,location:shortAddress.location},shortAddress);
 check(result.response.status===200&&result.result.events.length===1,'address without 市 uses geocoded administrative area');
 check(result.result.location===shortAddress.location,'original property scope remains unchanged');
 let genericOptions=generic('越秀区');
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(result.response.status===200&&result.result.events.length===0&&result.result.source.note.includes('尚未就绪'),'unconfigured search is explicit, not a claim of no local activities');
 check(!result.calls.some(call=>call.url.origin==='https://api.deepseek.com'),'unconfigured search makes no search/model request');
 genericOptions=generic('越秀区',{env:{DEEPSEEK_API_KEY:'disabled-search-fixture'}});
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(!result.calls.some(call=>call.url.origin==='https://api.deepseek.com'),'existing model credential alone does not enable event search');
 genericOptions=generic('越秀区',{env:{SEARCH_API_KEY:'search-only-fixture',DEEPSEEK_API_KEY:'unused-model-fixture'}});
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(result.response.status===200&&result.result.events.length===1,'generic full-content activity reaches desktop result in an unadapted city');
 check(result.result.events[0].title==='通用搜索隔离测试展'&&result.result.events[0].start==='2026-11-13'&&result.result.events[0].end==='2026-11-18','event evidence uses full content rather than snippet/publication date');
 check(result.result.events[0].verified&&result.result.events[0].id.startsWith('web-event-')&&result.result.events[0].distanceKm===0,'extracted venue is geocoded and distance checked');
 check(result.calls.filter(call=>call.url.origin==='https://mcp.amap.com').length===2,'both property and extracted activity venue are located');
 check(result.calls.filter(call=>call.url.origin==='https://api.deepseek.com').length===1,'exactly one bounded search request');
 genericOptions=generic('天河区',{env:{EVENT_SEARCH_ENABLED:'1',DEEPSEEK_API_KEY:'enabled-search-fixture'}});
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(result.response.status===200&&result.result.events.length===1&&result.calls.some(call=>call.url.origin==='https://api.deepseek.com'),'explicit opt-in may use official DeepSeek credential');
 genericOptions=generic('海珠区',{searchLimited:true,env:{SEARCH_API_KEY:'limited-search-fixture'}});
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(result.response.status===200&&result.result.events.length===0&&result.result.source.note.includes('搜索暂未成功'),'search 429 safely returns available fallback plus unavailable explanation');
 check(result.calls.filter(call=>call.url.origin==='https://mcp.amap.com').length===1,'failed search does not invent or geocode a venue');
 genericOptions=generic('荔湾区',{changedLocation:true,env:{SEARCH_API_KEY:'changed-search-fixture'}});
 result=await invoke({...eventInput,location:genericOptions.location},genericOptions);
 check(result.response.status===409&&!result.result.events&&result.calls.some(call=>call.url.origin==='https://api.deepseek.com'),'address changed during discovery returns 409 without old-address facts');
 for(const body of [{...initial,days:17},{...initial,days:0},{...initial,days:'7'},{...initial,start:'2026-02-30'},{...initial,propertyId:'bad'},{...initial,version:2},{...eventInput,end:'2026-12-10'},{...eventInput,end:'2026-11-11'},...['coordinates','url','headers','model','extra','end'].map(key=>({...initial,[key]:'unexpected'})),{...eventInput,days:7}]){
  result=await invoke(body);check(result.response.status===400&&result.calls.length===0,'invalid input rejected before network');
 }
 for(const start of ['2026-11-11','2026-11-28']){result=await invoke({...initial,start});check(result.response.status===422&&result.calls.length===0,'forecast range rejected before provider calls')}
 result=await invoke({...initial,location:'another location'});check(result.response.status===409&&result.calls.every(call=>call.url.origin.includes('supabase.co')),'address mismatch blocks providers');
 result=await invoke(initial,{changedLocation:true});check(result.response.status===409&&!result.result.days,'mid-request address change cannot attach stale facts');
 result=await invoke(initial,{emptyLocation:true});check(result.response.status===422,'missing address is explicit');
 result=await invoke(initial,{foreignProperty:true});check(result.response.status===403&&!JSON.stringify(result.result).includes(LOCATION),'foreign property hides profile');
 result=await invoke(initial,{}, {headers:{Authorization:`Bearer ${OTHER_TOKEN}`}});check(result.response.status===403&&result.calls.length===2,'cross account cannot use property');
 result=await invoke(initial,{}, {headers:{Authorization:''}});check(result.response.status===401&&result.calls.length===0,'missing bearer is rejected');
 result=await invoke(initial,{invalidToken:true});check(result.response.status===401&&result.calls.length===1,'invalid bearer stops before database');
 result=await invoke(initial,{ipLimited:true});check(result.response.status===429&&result.calls.length===0,'IP limiter protects auth');
 result=await invoke(initial,{userLimited:true});check(result.response.status===429&&result.calls.length===1,'verified account limiter protects providers');
 result=await invoke(initial,{env:{AUTH_RATE_LIMITER:undefined}});check(result.response.status===503&&result.calls.length===0,'missing limiter fails closed');
 result=await invoke(initial,{env:{SUPABASE_PUBLISHABLE_KEY:'sb_secret_disallowed'}});check(result.response.status===503&&result.calls.length===0,'secret/service-role key cannot configure worker');
 result=await invoke('x'.repeat(4097));check(result.response.status===413&&result.calls.length===0,'streamed input is bounded');
 result=await invoke(initial,{}, {headers:{Authorization:'Bearer '+('a'.repeat(8193))+'.b.c'}});check(result.response.status===401&&result.calls.length===0,'JWT length is bounded');
 result=await invoke(initial,{}, {method:'GET'});check(result.response.status===405&&result.calls.length===0,'only fixed POST accepted');
 result=await invoke(initial,{}, {url:'https://staycraft.online/desktop-api/v1/signals?url=evil'});check(result.response.status===404,'query forwarding unsupported');
 result=await invoke(initial,{}, {headers:{'Content-Type':'text/plain'}});check(result.response.status===415&&result.calls.length===0,'only JSON input accepted');
 for(const option of ['mapRedirect','mapOversize','mapInvalid','badPoint']){result=await invoke(initial,{[option]:true});check(result.response.status===503,'invalid map result fails safely')}
 result=await invoke(initial,{weatherRedirect:true});check(result.response.status===200&&result.result.days.length===0&&result.result.source.coverage.kind==='none','weather failure never becomes invented weather');
 result=await invoke(initial,{hang:true,timeoutMs:20});check(result.response.status===503||result.response.status===504,'hung upstream has total timeout');
 const config=JSON.parse(await readFile(path.join(root,'desktop-api/wrangler.jsonc'),'utf8'));
 check(config.name==='staycraft-desktop-signals'&&config.routes.length===1&&config.routes[0].pattern==='staycraft.online/desktop-api/*','independent narrow Worker route');
 check(!config.assets&&!config.services&&config.workers_dev===false&&config.preview_urls===false,'no frontend/service binding or public preview');
 check(config.secrets.required.join() ==='AMAP_MAPS_API_KEY'&&!Object.keys(config.vars).some(key=>/MODEL|SERVICE_ROLE|AMAP/.test(key)),'only declared private map key, public database config');
 console.log('Desktop signals Worker offline QA passed: '+assertions+' assertions; no live network, model calls or database writes.');
}
const keepAlive=setInterval(()=>{},1000);
main().catch(error=>{console.error(error.message);process.exitCode=1}).finally(()=>clearInterval(keepAlive));
