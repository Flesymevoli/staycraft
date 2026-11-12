// Pure regression checks: provider responses are mocked, with no database writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const cache=new Map();
function load(file){
 const filename=path.resolve('src/lib',file+'.ts');
 if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,id=>id.startsWith('.')?load(path.relative(path.resolve('src/lib'),path.resolve(path.dirname(filename),id))):require(id));
 return mod.exports;
}
const {composePromotion,promotionCopy}=load('promotion');
const {buildPromotionWritingContext}=load('promotion-writing-context');
Object.assign(process.env,{MODEL_BASE_URL:'https://provider.invalid/v1',MODEL_NAME:'mock-writing',MODEL_API_KEY:'mock-only',MODEL_AUTH_MODE:'api-key',DEEPSEEK_API_KEY:''});
let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const brief={language:'zh',channel:'wechat',goal:'rooms',start:'2026-11-14',end:'2026-11-14',sourceIds:[]};
const name='桥边书舍（虚构）';
const facts=[
 {id:'property',text:`民宿名称：${name}`},
 {id:'location',text:'位置：苏州市太仓市浏河镇'},
 {id:'room_0',text:'房型：临河大床房，最多入住 2 人。'},
 {id:'room_1',text:'房型：家庭套房，最多入住 4 人。'},
 {id:'notes',text:'民宿说明：一楼设有阅读角与临河木窗。独立测试账号；本次订单为虚构演练数据。'},
 {id:'guestNotes',text:'客人须知：入住时出示证件。'},
 {id:'checkin',text:'入住时间：14:00'}
];
const plan={version:1,title:'留一点阅读的时间',audience:'想一起慢住的两位朋友',angle:'从阅读角展开一次不赶行程的小住邀请',publishTiming:'入住前核对',start:brief.start,end:brief.end,factIds:['property','location','room_0','notes'],engine:'rules_v1'};
const reason='目标日期入住率为17.9%，还有23个空房间夜，需要改善经营收入。';
const event={id:'10000000-0000-4000-8000-000000000001',title:'四时与小物——赵夏橦个人项目',summary:'太仓市图书馆；地址：太仓市上海东路100号。',url:'https://museum.example/events',start:'2026-10-17',end:'2026-11-29',checkedOn:'2026-11-12'};
const weather={id:'20000000-0000-4000-8000-000000000002',title:'太仓 2026-11-14 天气预报',summary:'多云，最低 12°C，最高 19°C · 获取于 2026-11-12 · 预报可能变化',url:'https://weather.example/forecast',start:'2026-11-14',end:'2026-11-14',checkedOn:'2026-11-12'};
const response=(content,finish='stop')=>Response.json({choices:[{finish_reason:finish,message:{content:JSON.stringify({content})}}]});
const generate=(content,options={})=>composePromotion(facts,brief,name,{model:true,plan,diagnosisReason:reason,fetcher:async()=>response(content),...options});
const styleProblem=/谁懂啊|挖到宝|藏不住了|家人们|绝美|天花板|氛围感拉满|必打卡|闭眼冲|[!！#]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const businessLeak=/入住率|空房间夜|改善经营|独立测试账号|虚构演练数据|入住时出示证件/;
const noUnexpected=(copy)=>{
 check(!styleProblem.test(copy),'restrained style across both stored channel values');
 check(!businessLeak.test(copy),'guest copy does not paste internal notes or diagnosis');
 check(!/避开周末人潮|住上两晚|连住2晚|周三或周四/.test(copy),'single Saturday is not recast as a two-night weekday gap');
};

(async()=>{
 const context=buildPromotionWritingContext(facts,brief,name,{source:event,plan,diagnosisReason:reason});
 equal(context.property.name,name,'complete property name retains fictional label');
 equal(context.property.location,'苏州市太仓市浏河镇');
 check(context.property.rooms.some(room=>room.name==='临河大床房'&&room.capacity===2),'structured room retains verified capacity');
 check(context.property.features.some(feature=>feature.includes('阅读角')),'a real space is available as creative material');
 check(!businessLeak.test(context.property.features.join('\n')),'property features exclude internal/test/guest-rule text');
 equal(context.stayWindow,{start:brief.start,end:brief.end},'one-day target is not widened');
 equal(context.selectedSource.kind,'event');
 equal(context.selectedSource.start,event.start,'event date is distinct from stay date');
 equal(context.creativeDirection.audience,plan.audience);
 equal(context.creativeDirection.angle,plan.angle);
 equal(context.internalDiagnosisReason,reason,'operating reason is kept in a separate internal field');

 for(const channel of ['wechat','xiaohongshu']){
  const rules=await composePromotion(facts,{...brief,channel},name,{model:false,plan,diagnosisReason:reason,evidence:{},fetcher:()=>{throw Error('rules must not call provider')}});
  equal(rules.engine,'rules_v1');equal(rules.fallback,false);noUnexpected(rules.content);
  for(const word of [name,'阅读角','临河大床房','2026-11-14'])check(rules.content.includes(word),'fallback uses supplied '+word);
  check(/私信|联系/.test(rules.content)&&/日期/.test(rules.content),'fallback ends in a practical booking inquiry');
  check(!/房型与容量：|房型可以先看看|· 临河大床房/.test(rules.content),'space becomes a stay scene rather than a room list');
 }
 const minimal=await composePromotion([{id:'location',text:'位置：另一座城市'},{id:'room_0',text:'房型：庭院大床房，最多入住 2 人。'}],{...brief,start:'2026-12-05',end:'2026-12-05'},'另一间小住',{model:false,evidence:{}});
 check(minimal.content.includes('另一间小住')&&minimal.content.includes('另一座城市')&&minimal.content.includes('2026-12-05'),'changing property and dates changes copy');
 check(!/阅读角|临河木窗|桥边书舍|2026-11-14/.test(minimal.content),'facts do not bleed across accounts');
 check(!/在.{0,3}庭院|院子里|煮茶|露台|木窗|江景/.test(minimal.content),'a room name alone does not create a physical facility or scene');
 const legacy=promotionCopy({...brief,channel:'xiaohongshu'},name,facts,facts.map(f=>f.id));noUnexpected(legacy);

 const eventBrief={...brief,sourceIds:[event.id]};
 const localEvent=await composePromotion(facts,eventBrief,name,{model:false,evidence:{source:event},plan,diagnosisReason:reason});
 for(const value of [event.title,event.start,event.end,brief.start])check(localEvent.content.includes(value),'event fallback preserves '+value);
 check(!/免费|赠送|折扣|步行.{0,5}分钟|800米/.test(localEvent.content),'nearby source creates no offer or transport promise');
 noUnexpected(localEvent.content);
 const localWeather=await composePromotion(facts,{...brief,sourceIds:[weather.id]},name,{model:false,evidence:{source:weather}});
 check(localWeather.content.includes(weather.start)&&localWeather.content.includes('12')&&localWeather.content.includes('19'),'forecast date and temperatures remain evidence-based');
 check(/预报|forecast/i.test(localWeather.content)&&/最新|变化|更新|change/i.test(localWeather.content),'weather stays a changeable forecast');
 check(!/一定晴|保证|必定|正值满树金黄/.test(localWeather.content),'no season or guaranteed-weather invention');

 const literary='把这一页读慢一点\n\n在桥边书舍（虚构），不妨把阅读角留给一段不看时钟的时间。翻过几页书，再聊聊还没说完的话，让行程也有一点留白。\n\n若计划在 2026-11-14 来小住，私信告诉我们入住日期和人数，一起确认临河大床房与价格。';
 let request;
 const modeled=await generate(literary,{fetcher:async(url,init)=>{equal(init.redirect,'manual');request=JSON.parse(init.body);return response(literary);}});
 equal(modeled.engine,'model_v1','grounded literary scene is accepted');equal(modeled.content,literary,'complete model draft is not wrapped in another template');
 const payload=JSON.parse(request.messages[1].content);
 equal(payload.writingContext.property.name,name);equal(payload.writingContext.stayWindow,{start:brief.start,end:brief.end});
 equal(payload.writingContext.creativeDirection.audience,plan.audience);equal(payload.writingContext.internalDiagnosisReason,reason);
 equal(payload.mustInclude,[name],'exact required names are explicit in the writing input');
 check(!Object.hasOwn(payload,'facts')&&!JSON.stringify(payload).includes('独立测试账号'),'raw mixed private notes are not sent alongside the cleaned context');
 check(request.messages[0].content.includes('JSON'),'model output has a structured contract');
 check(request.messages[0].content.includes('默认不主动写具体价格、折扣或剩余房量'),'ordinary promotion does not solicit commercial numbers');
 const twoParagraphs=`在${name}，把阅读角留给一段不看时钟的时间。书读到哪里，话聊到哪里，行程不妨慢一点。\n\n2026-11-14 若想来小住，私信日期与人数，一起核对临河大床房的安排。`;
 equal((await generate(twoParagraphs)).engine,'model_v1','two paragraphs do not need a fixed title or dawn/afternoon sequence');
 equal((await composePromotion(facts,{...brief,channel:'xiaohongshu'},name,{model:true,fetcher:async()=>response(literary)})).engine,'model_v1','legacy marketing channel no longer requires shouts, emoji or hashtags');

 const eventCopy=`为一场展览，留一点小住的时间\n\n「${event.title}」在 ${event.start} 至 ${event.end} 开展，想去太仓市图书馆看看，可以先核对主办方的最新安排。把喜欢的作品留在记忆里，也把一段阅读时间留给${name}。\n\n计划在 ${brief.start} 入住的话，私信日期与人数，一起核对临河大床房与价格。`;
 let eventPayload;
 await generate(eventCopy,{evidence:{source:event},fetcher:async(_url,init)=>{eventPayload=JSON.parse(JSON.parse(init.body).messages[1].content);return response(eventCopy);}});
 equal(eventPayload.mustInclude,[name,event.title],'selected source identity is required separately from literary scenes');
 equal((await generate(eventCopy,{evidence:{source:event}})).engine,'model_v1','a source date outside the stay window remains a valid event date');
 const forecastCopy=`给出发留一点弹性\n\n${weather.title}显示多云，12°C 至 19°C，出发前仍要看看最新预报。把${name}的阅读角放进行程，天气若有变化，也不妨给自己留一点翻书的时间。\n\n计划在 ${brief.start} 来住，私信日期和人数，一起核对临河大床房。`;
 equal((await generate(forecastCopy,{evidence:{source:weather}})).engine,'model_v1','dated forecast and conditional atmosphere are accepted');
 equal((await generate(forecastCopy.replaceAll('°C','℃'),{evidence:{source:weather}})).engine,'model_v1','equivalent Celsius notation does not change the forecast');
 const groundedAlias=literary.replace('不妨把阅读角留给一段不看时钟的时间','不妨在书角翻几页书，让目光偶尔从书页移向临河木窗');
 equal((await generate(groundedAlias)).engine,'model_v1','grounded facility aliases and literary light are accepted');
 const additionalFacts=[...facts,{id:'feature_0',text:'客房配有投影仪与浴缸。'},{id:'breakfast',text:'早餐时间：08:00–09:30'}];
 const providedFeatures=literary.replace('翻过几页书，再聊聊还没说完的话，让行程也有一点留白。','看一部想看的电影，给投影仪前的时光留一点余地。早餐安排在08:00–09:30，按自己的节奏开始新的一天。');
 equal((await composePromotion(additionalFacts,brief,name,{model:true,fetcher:async()=>response(providedFeatures)})).engine,'model_v1','verified facilities and breakfast hours remain usable beyond a small scene vocabulary');

 const creativeVariants=[
  ['shouting',literary+' 谁懂啊，挖到宝了'],
  ['exclamation',literary+' 欢迎来住！'],
  ['emoji',literary+' ✨'],
  ['hashtags',literary+' #旅行灵感'],
  ['invented tree and paving',literary+' 梧桐叶子铺在青石板路上。'],
  ['invented view and animals',literary+' 推开窗看看邻居的屋顶和飞过的鸽子。'],
  ['invented bridge and streetlights',literary+' 路灯亮起，水面映出桥的影子。'],
  ['invented local food',literary+' 回来时在桥头买一包热栗子。'],
 ];
 for(const [label,content] of creativeVariants){
  const result=await generate(content);equal(result.engine,'model_v1',label+' remains a usable draft');equal(result.content,content,label+' is preserved');
 }
 const rejected=[
  ['facility',literary+' 入住后可以去泳池游泳。'],
  ['view',literary+' 客房带有落地窗。'],
  ['price',literary+' 每晚只要199元。'],
  ['creative style cannot bypass availability',literary+' 猫在屋顶打盹 ✨ 临河大床房目前可预订！'],
  ['creative style cannot bypass price',literary+' 梧桐叶落在石板路上，每晚只要199元！'],
  ['gift',literary+' 住下就赠送下午茶。'],
  ['discount',literary+' 连住两晚享九折。'],
  ['invented capacity',literary+' 临河大床房最多入住8人。'],
  ['personal stay',literary+' 我住过这里，值得再来。'],
  ['diagnosis leak',literary+' 当前入住率17.9%，还有23个空房间夜。'],
  ['operating notes leak',literary+' 独立测试账号，本次订单为虚构演练数据。'],
  ['asserted availability',literary+' 有一间临河大床房空着。'],
  ['asserted bookability',literary+' 临河大床房目前可预订。'],
  ['conditional visit does not prove availability',literary+' 如果你想来，临河大床房有一间空着。'],
  ['unpunctuated conditional visit does not prove availability',literary+' 如果你想来临河大床房有一间空着。'],
  ['invented cooking ability',literary+' 买些食材回来，在房间里简单做一顿饭。'],
  ['invented room size',literary+' 临河大床房不大，但足够两个人住得舒展。'],
  ['invented street view',literary+' 窗外是老街和安静的河道。'],
  ['invented water level',literary+' 河水涨到窗台的高度。'],
  ['punctuated availability',literary+' 临河大床房，在十一月十五日那天，恰好空着。'],
 ];
 for(const [label,content] of rejected){
  const result=await generate(content);equal(result.engine,'rules_v1',label+' falls back');equal(result.fallback,true,label+' is reported as fallback');noUnexpected(result.content);
 }
 for(const invitation of ['私信来核对临河大床房是否还空着。','如果临河大床房可预订，可以再核对入住安排。','如果有一间临河大床房空着，可以再核对入住安排。','带上自己喜欢的茶，或出门找一间茶馆坐坐。','光线落在书页上，不妨给日子留一点空白。','可私信了解房间面积与入住安排。','想知道房间是否宽敞，可以先私信问问。','在窗边翻几页书，再去老街看看纸艺展。']){
  equal((await generate(literary+' '+invitation)).engine,'model_v1','conditional enquiries and literary gestures stay usable: '+invitation);
 }
 for(const [feature,copy] of [
  ['客房配有厨房与厨具。','在房间里简单做一顿饭。'],
  ['客房宽敞，适合停留。','客房宽敞，可以按自己的节奏收拾行李。'],
  ['木窗面向老街，能看到街景。','窗外是老街，给自己留一会儿看看的时间。'],
  ['民宿内保留梧桐树和青石板路。','不妨看看梧桐与青石板路，给行程留一点空白。'],
 ])equal((await composePromotion([...facts,{id:'feature_1',text:feature}],brief,name,{model:true,fetcher:async()=>response(literary+' '+copy)})).engine,'model_v1','explicitly supplied property details remain usable');
 const namedSizeFacts=facts.map(fact=>fact.id==='room_0'?{...fact,text:'房型：大床房·宽敞型，最多入住 2 人。'}:fact);
 equal((await composePromotion(namedSizeFacts,brief,name,{model:true,fetcher:async()=>response(literary.replaceAll('临河大床房','大床房·宽敞型'))})).engine,'model_v1','a verbatim room-type label does not make a size assertion');
 const areaFacts=[...facts,{id:'feature_2',text:'客房面积为25平方米。'}];
 equal((await composePromotion(areaFacts,brief,name,{model:true,fetcher:async()=>response(literary+' 客房面积为25平米。')})).engine,'model_v1','equivalent area units preserve a supplied measurement');
 equal((await composePromotion(areaFacts,brief,name,{model:true,fetcher:async()=>response(literary+' 客房面积为50平方米。')})).engine,'rules_v1','a supplied area does not license a different size');
 for(const [label,content,source] of [
  ['event omitted',literary,event],
  ['event date invented',eventCopy.replaceAll(event.start,'2026-12-25').replaceAll(event.end,'2026-12-31'),event],
  ['guaranteed weather',forecastCopy+' 这天一定晴朗，保证能看到日出。',weather],
  ['invented temperature',forecastCopy.replace('12°C 至 19°C','25°C 至 30°C'),weather],
  ['temperature substring',forecastCopy.replace('12°C 至 19°C','2°C 至 9°C'),weather],
 ])equal((await generate(content,{evidence:{source}})).engine,'rules_v1',label+' falls back');

 for(const fetcher of [async()=>new Response(null,{status:503}),async()=>{throw new Error('mock timeout')},async()=>response(literary,'length'),async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"content":'}}]})]){
  const result=await generate(literary,{fetcher});equal(result.engine,'rules_v1');equal(result.fallback,true);noUnexpected(result.content);
 }
 const enFacts=[{id:'property',text:'Property name: Page House (fictional)'},{id:'location',text:'Location: Old Town'},{id:'room_0',text:'Room type: Double room, for up to 2 guests.'},{id:'notes',text:'Property notes: A reading corner is on the ground floor.'}];
 const enBrief={...brief,language:'en',channel:'xiaohongshu'};
 const enRules=await composePromotion(enFacts,enBrief,'Page House (fictional)',{model:false,evidence:{}});
 check(enRules.content.includes('Page House (fictional)')&&enRules.content.includes('2026-11-14'),'English fallback retains identity and stay window');
 check(/reading|book/i.test(enRules.content),'English facts become a grounded reading scene');noUnexpected(enRules.content);
 const enCopy='Let a page take its time\n\nAt Page House (fictional), leave a little room in your day for the reading corner. A few pages, a little conversation, and a trip that does not need every minute planned.\n\nThinking of staying on 2026-11-14? Message us with your dates and group size to check the Double room and rates.';
 equal((await composePromotion(enFacts,enBrief,'Page House (fictional)',{model:true,fetcher:async()=>response(enCopy)})).engine,'model_v1','English prose follows the same full-draft path');
 console.log(`PASS ${checks} promotion writing checks: grounded scenes, flexible composition, source/date fidelity, internal-data separation and consistent fallback. Mock model only; no database writes.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
