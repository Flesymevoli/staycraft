const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
// Load the TypeScript modules in-memory; no build step and no network.
function load(file){const target=path.resolve(__dirname,'../src/lib',file),mod=new Module(target);mod.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(target),name)+'.ts'):require(name);mod._compile(ts.transpileModule(fs.readFileSync(target,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,target);return mod.exports;}
const {detectBookingPace,detectCancellationRate,detectChannelMix,detectPriceVolumeDivergence,detectGapWindow,detectAll,THRESHOLDS}=load('decisions/detectors.ts');
const {buildOpportunities,selectPriorityOpportunities,renderOpportunityText,localized}=load('decisions/opportunity.ts');

const DAY=86400000;
const iso=time=>new Date(time).toISOString().slice(0,10);
const daily=(start,end,make)=>{const out=[];for(let time=Date.parse(start+'T00:00:00Z'),last=Date.parse(end+'T00:00:00Z');time<=last;time+=DAY)out.push(make(iso(time)));return out;};
const metric=(date,{booked=0,capacity=10,available=0,amountCents=null}={})=>({date,booked,capacity,available,bookedPct:capacity?Math.round(booked/capacity*1000)/10:null,amountCents});
const order=(arrival,status,source)=>({arrival,status,totalCny:1000,source:source===undefined?null:source});
const nullMetric=date=>({date,booked:0,capacity:null,available:null,bookedPct:null,amountCents:null});
const checkSignals=(signals,label)=>{
 assert.ok(Array.isArray(signals),label+': array');
 for(const signal of signals){
  assert.ok(Array.isArray(signal.evidenceIds)&&signal.evidenceIds.length>0,label+': evidenceIds non-empty');
  assert.ok(Array.isArray(signal.unknowns),label+': unknowns array');
  assert.ok(signal.metric.value===null||Number.isFinite(signal.metric.value),label+': value null or number');
  assert.ok(['high','medium','low'].includes(signal.severity)&&['high','medium','low'].includes(signal.confidence),label+': levels');
 }
};
const checkOpportunities=(opportunities,label)=>{
 assert.ok(Array.isArray(opportunities),label+': array');
 assert.ok(opportunities.length<=3,label+': at most 3');
 const seen=new Set();
 for(const opportunity of opportunities){
  assert.ok(['risk','opportunity'].includes(opportunity.kind),label+': kind');
  assert.ok(typeof opportunity.title==='string'&&opportunity.title.length>0,label+': title');
  assert.ok(typeof opportunity.claim==='string'&&opportunity.claim.length>0,label+': claim');
  assert.ok(typeof opportunity.coverage==='string'&&opportunity.coverage.length>0,label+': coverage');
  assert.ok(Array.isArray(opportunity.unknowns),label+': unknowns');
  assert.ok(Array.isArray(opportunity.actions)&&opportunity.actions.length>=1,label+': actions');
  assert.ok(opportunity.actions.every(action=>['data','market','promotion','diagnosis'].includes(action.target)),label+': action target');
  assert.ok(Array.isArray(opportunity.basis)&&opportunity.basis.length>=1,label+': basis');
  assert.ok(!seen.has(opportunity.id),label+': unique id');
  seen.add(opportunity.id);
 }
};

try {
 // Thresholds are the single tuning surface.
 assert.equal(THRESHOLDS.bookingPace.dropPct,30);assert.equal(THRESHOLDS.bookingPace.highDropPct,45);
 assert.equal(THRESHOLDS.cancellationRate.increasePp,10);assert.equal(THRESHOLDS.cancellationRate.ratePct,20);
 assert.equal(THRESHOLDS.channelMix.sharePct,70);assert.equal(THRESHOLDS.channelMix.shiftPp,25);
 assert.equal(THRESHOLDS.priceVolume.changePct,5);assert.equal(THRESHOLDS.gapWindow.minNights,3);

 // booking_pace: trigger / no trigger / insufficient history / empty data / high severity.
 const paceDaily=booked=>daily('2026-11-18','2026-11-24',date=>metric(date,{booked,capacity:10}));
 const previous={id:'prior',status:'completed',generatedAt:'2026-11-11T08:00:00Z',
  period:{start:'2026-11-11',end:'2026-11-17'},
  dailyMetrics:daily('2026-11-11','2026-11-17',date=>metric(date,{booked:10,capacity:10}))};
 const runPace=(booked,prior=previous)=>detectBookingPace({daily:paceDaily(booked),today:'2026-11-18',horizonDays:7,previous:prior});
 const paceTrigger=runPace(7);
 checkSignals(paceTrigger,'same-lead booking pace');
 assert.equal(paceTrigger.length,1);assert.equal(paceTrigger[0].metric.value,70);assert.equal(paceTrigger[0].baseline.value,100);
 assert.equal(paceTrigger[0].baseline.samples,7);assert.equal(paceTrigger[0].severity,'medium');
 assert(paceTrigger[0].evidenceIds.includes('diagnosis:prior'));
 assert.equal(runPace(10).length,0);
 assert.equal(runPace(5)[0].severity,'high');
 assert.equal(runPace(7,null)[0].metric.value,null);
 assert.equal(runPace(7,{...previous,generatedAt:'2026-11-12T08:00:00Z'})[0].metric.value,null);
 assert.equal(runPace(7,{...previous,dailyMetrics:previous.dailyMetrics.slice(1)})[0].metric.value,null);
 assert.equal(runPace(7,{...previous,dailyMetrics:previous.dailyMetrics.map(d=>({...d,capacity:11}))})[0].metric.value,null);

 // cancellation_rate: rate-only, delta-only, cross-year, no trigger, insufficient samples.
 const cancelWindow={start:'2026-11-01',end:'2026-11-14'},priorWindow={start:'2026-10-18',end:'2026-10-31'};
 const canceledOrders=(total,canceledCount,arrival='2026-11-05',status='cancelled')=>Array.from({length:total},(_,index)=>order(arrival,index<canceledCount?status:'confirmed','airbnb'));
 const rateOnly=detectCancellationRate({orders:[...canceledOrders(10,3),...canceledOrders(10,3,'2026-10-25')],window:cancelWindow,previousWindow:priorWindow});
 checkSignals(rateOnly,'cancellation rate-only');
 assert.equal(rateOnly.length,1);assert.equal(rateOnly[0].metric.value,30);assert.equal(rateOnly[0].baseline.value,30);assert.equal(rateOnly[0].severity,'high');
 const deltaOnly=detectCancellationRate({orders:[...canceledOrders(10,2),...canceledOrders(10,0,'2026-10-25','confirmed')],window:cancelWindow,previousWindow:priorWindow});
 checkSignals(deltaOnly,'cancellation delta-only');
 assert.equal(deltaOnly.length,1);assert.equal(deltaOnly[0].metric.value,20);assert.equal(deltaOnly[0].baseline.value,0);
 const crossYear=detectCancellationRate({orders:[...canceledOrders(10,5,'2027-01-02'),...canceledOrders(10,0,'2026-12-10','confirmed')],window:{start:'2026-12-20',end:'2027-01-05'},previousWindow:{start:'2026-12-03',end:'2026-12-19'}});
 checkSignals(crossYear,'cancellation cross-year');
 assert.equal(crossYear.length,1);assert.equal(crossYear[0].window.start,'2026-12-20');assert.equal(crossYear[0].metric.value,50);
 assert.equal(detectCancellationRate({orders:[...canceledOrders(10,1),...canceledOrders(10,1,'2026-10-25')],window:cancelWindow,previousWindow:priorWindow}).length,0);
 const cancelEmpty=detectCancellationRate({orders:[],window:cancelWindow,previousWindow:priorWindow});
 checkSignals(cancelEmpty,'cancellation empty');assert.equal(cancelEmpty.length,1);assert.equal(cancelEmpty[0].metric.value,null);
 const cancelNoPrior=detectCancellationRate({orders:canceledOrders(10,3),window:cancelWindow,previousWindow:priorWindow});
 checkSignals(cancelNoPrior,'cancellation no prior');assert.equal(cancelNoPrior[0].metric.value,null);assert.ok(cancelNoPrior[0].unknowns.length>0);

 // channel_mix: single channel, shift-only, no trigger, missing source.
 const channelOrders=(airbnb,other,arrival='2026-11-05')=>[...Array.from({length:airbnb},()=>order(arrival,'confirmed','airbnb')),...Array.from({length:other},()=>order(arrival,'confirmed','booking.com'))];
 const single=detectChannelMix({orders:channelOrders(10,0),window:cancelWindow,previousWindow:priorWindow});
 checkSignals(single,'channel single');
 assert.equal(single.length,1);assert.equal(single[0].metric.value,100);assert.equal(single[0].severity,'high');
 assert.equal(single[0].threshold.op,'gt');assert.ok(single[0].id.endsWith(':airbnb'));
 const shiftOnly=detectChannelMix({orders:[...channelOrders(7,3),...channelOrders(4,6,'2026-10-25')],window:cancelWindow,previousWindow:priorWindow});
 checkSignals(shiftOnly,'channel shift-only');
 assert.equal(shiftOnly.length,1);assert.equal(shiftOnly[0].metric.value,70);assert.equal(shiftOnly[0].baseline.value,40);
 assert.equal(shiftOnly[0].threshold.op,'outside');assert.equal(shiftOnly[0].threshold.value,25);
 assert.equal(detectChannelMix({orders:[...channelOrders(6,4),...channelOrders(6,4,'2026-10-25')],window:cancelWindow,previousWindow:priorWindow}).length,0);
 const noSource=detectChannelMix({orders:Array.from({length:6},()=>order('2026-11-05','confirmed',undefined)),window:cancelWindow,previousWindow:priorWindow});
 checkSignals(noSource,'channel missing source');assert.equal(noSource[0].metric.value,null);assert.ok(noSource[0].unknowns.length>0);

 // price_volume_divergence: trigger (2 signals), same direction, missing amounts.
 const divergenceDaily=(current,previous)=>[...daily('2026-10-18','2026-10-31',date=>metric(date,{booked:previous.booked,amountCents:previous.amountCents})),...daily('2026-11-01','2026-11-14',date=>metric(date,{booked:current.booked,amountCents:current.amountCents}))];
 const divergent=detectPriceVolumeDivergence({daily:divergenceDaily({booked:10,amountCents:500000},{booked:12,amountCents:480000}),window:cancelWindow,previousWindow:priorWindow});
 checkSignals(divergent,'price divergence trigger');
 assert.equal(divergent.length,2);
 const priceSignal=divergent.find(signal=>signal.metric.name==='average_price'),nightSignal=divergent.find(signal=>signal.metric.name==='room_nights');
 assert.ok(priceSignal&&nightSignal);
 assert.equal(priceSignal.metric.value,500);assert.equal(priceSignal.baseline.value,400);assert.equal(priceSignal.threshold.op,'gt');assert.equal(priceSignal.threshold.value,420);
 assert.equal(nightSignal.metric.value,140);assert.equal(nightSignal.baseline.value,168);assert.equal(nightSignal.threshold.op,'lt');assert.equal(nightSignal.threshold.value,159);
 assert.equal(divergent[0].severity,'high');assert.equal(divergent[0].confidence,'high');
 assert.equal(detectPriceVolumeDivergence({daily:divergenceDaily({booked:12,amountCents:600000},{booked:10,amountCents:400000}),window:cancelWindow,previousWindow:priorWindow}).length,0);
 const noAmounts=detectPriceVolumeDivergence({daily:divergenceDaily({booked:10,amountCents:null},{booked:12,amountCents:null}),window:cancelWindow,previousWindow:priorWindow});
 checkSignals(noAmounts,'price divergence no amounts');assert.equal(noAmounts.length,1);assert.equal(noAmounts[0].metric.value,null);

 // gap_window: exactly 3 nights, 2 nights, cross-month/year, no availability data.
 const gapWindow={start:'2026-11-19',end:'2026-11-25'};
 const gapDaily=openDates=>daily('2026-11-19','2026-11-25',date=>metric(date,{available:openDates.includes(date)?2:0}));
 const threeNights=detectGapWindow({daily:gapDaily(['2026-11-19','2026-11-20','2026-11-21']),window:gapWindow});
 checkSignals(threeNights,'gap 3 nights');
 assert.equal(threeNights.length,1);assert.equal(threeNights[0].metric.value,3);assert.equal(threeNights[0].threshold.value,2);
 assert.equal(threeNights[0].window.start,'2026-11-19');assert.equal(threeNights[0].window.end,'2026-11-21');
 assert.equal(detectGapWindow({daily:gapDaily(['2026-11-19','2026-11-20']),window:gapWindow}).length,0);
 const crossYearGap=detectGapWindow({daily:daily('2026-12-28','2027-01-05',date=>metric(date,{available:['2026-12-31','2027-01-01','2027-01-02'].includes(date)?1:0})),window:{start:'2026-12-28',end:'2027-01-05'}});
 checkSignals(crossYearGap,'gap cross-year');
 assert.equal(crossYearGap.length,1);assert.equal(crossYearGap[0].window.start,'2026-12-31');assert.equal(crossYearGap[0].window.end,'2027-01-02');
 const noAvailability=detectGapWindow({daily:daily('2026-11-19','2026-11-25',date=>nullMetric(date)),window:gapWindow});
 checkSignals(noAvailability,'gap no availability');assert.equal(noAvailability.length,1);assert.equal(noAvailability[0].metric.value,null);assert.ok(noAvailability[0].unknowns.length>0);

 // detectAll ties the five detectors together and never drops evidence ids.
 const allSignals=detectAll({daily:paceDaily(7),orders:[...canceledOrders(10,3),...channelOrders(7,3)],today:'2026-11-18',window:cancelWindow,previousWindow:priorWindow});
 checkSignals(allSignals,'detectAll');assert.ok(allSignals.length>=3);
 const allEmpty=detectAll({today:'2026-11-18'});checkSignals(allEmpty,'detectAll empty');assert.equal(allEmpty.length,5);
 assert.ok(allEmpty.every(signal=>signal.metric.value===null));

 // Opportunities: empty, ordering, limit, dedupe of a price pair, all actions targets.
 const signal=(kind,severity,start,end,options={})=>({id:`${kind}:${start}:${end}`,kind,window:{start,end},metric:{name:'test',unit:'pct',value:options.value===undefined?1:options.value},baseline:{kind:'prior_period',value:1,samples:2},threshold:{op:'gt',value:1},severity,confidence:options.confidence||'high',evidenceIds:['test'],unknowns:options.unknowns||[]});
 assert.deepEqual(buildOpportunities({signals:[]}),[]);
 const sorted=buildOpportunities({signals:[signal('gap_window','low','2026-11-19','2026-11-21'),signal('cancellation_rate','high','2026-11-01','2026-11-14'),signal('channel_mix','medium','2026-11-05','2026-11-18')]});
 checkOpportunities(sorted,'opp ordering');
 assert.deepEqual(sorted.map(opportunity=>opportunity.basis[0].kind),['cancellation_rate','channel_mix','gap_window']);
 const sameLevel=buildOpportunities({signals:[signal('booking_pace','medium','2026-11-20','2026-11-26'),signal('booking_pace','medium','2026-11-19','2026-11-25')]});
 assert.deepEqual(sameLevel.map(opportunity=>opportunity.window.start),['2026-11-19'],'one card per detector family, earliest equal-priority window first');
 const five=buildOpportunities({signals:Array.from({length:5},(_,index)=>signal('gap_window','low',`2026-11-${19+index}`,'2026-11-25'))});
 checkOpportunities(five,'opp limit');assert.equal(five.length,1,'repeated gap windows cannot fill the priority list');
 const dataGap=buildOpportunities({signals:[signal('booking_pace','low','2026-11-19','2026-12-02',{value:null,confidence:'low',unknowns:['缺少房量数据']})]});
 checkOpportunities(dataGap,'opp data');assert.deepEqual(dataGap,[],'missing evidence is not an actionable opportunity');
 assert.deepEqual(buildOpportunities({signals:allEmpty}),[],'an empty account cannot acquire risk cards from missing data');
 const diagnosis=buildOpportunities({signals:[signal('booking_pace','high','2026-11-19','2026-12-02',{value:70})]});
 checkOpportunities(diagnosis,'opp diagnosis');assert.equal(diagnosis[0].actions[0].target,'diagnosis');
 const events=[{id:'event-inside',title:'本地展览',start:'2026-11-20',end:'2026-11-21',category:'exhibition'},{id:'event-outside',title:'远方活动',start:'2026-12-10',end:'2026-12-12',category:'other'}];
 const weather=[{date:'2026-11-22',code:1},{date:'2026-12-10',code:3}];
 const anchors=[{id:'anchor-inside',name:'竞品 A',stayDate:'2026-11-25',amountCny:480},{id:'anchor-outside',name:'竞品 B',stayDate:'2026-12-20',amountCny:500}];
 const promotion=buildOpportunities({signals:[signal('booking_pace','high','2026-11-19','2026-12-02',{value:70})],bundle:{events,weather}});
 checkOpportunities(promotion,'opp promotion');
 assert.equal(promotion[0].actions[0].target,'promotion');assert.equal(promotion[0].events.length,1);assert.equal(promotion[0].events[0].id,'event-inside');
 assert.equal(promotion[0].weather.length,1);assert.equal(promotion[0].weather[0].date,'2026-11-22');
 const market=buildOpportunities({signals:[signal('booking_pace','high','2026-11-19','2026-12-02',{value:70})],bundle:{events,weather,anchors}});
 checkOpportunities(market,'opp market');assert.equal(market[0].actions[0].target,'market');
 assert.equal(market[0].anchors.length,1);assert.equal(market[0].anchors[0].id,'anchor-inside');
 const actionableGap=signal('gap_window','high','2026-11-19','2026-12-02',{value:7});
 const gapWithQuotes=buildOpportunities({signals:[actionableGap],bundle:{events,weather,anchors}});
 assert.deepEqual(gapWithQuotes[0].actions.map(action=>action.target),['market','promotion'],'same-date market evidence does not suppress promotion for known vacancy');
 const gapWithoutExternal=buildOpportunities({signals:[actionableGap]});
 assert.deepEqual(gapWithoutExternal[0].actions.map(action=>action.target),['promotion'],'confirmed open dates support property-based promotion');
 const missingGap=buildOpportunities({signals:[{...actionableGap,confidence:'low'}],bundle:{anchors}});
 assert.deepEqual(missingGap[0].actions.map(action=>action.target),['data'],'weak vacancy evidence still asks for data');
 const pair=buildOpportunities({signals:divergent});
 checkOpportunities(pair,'opp price pair');assert.equal(pair.length,1);assert.equal(pair[0].basis.length,2);assert.equal(pair[0].kind,'risk');
 const live=buildOpportunities({signals:allSignals,bundle:{events,weather,anchors},now:new Date('2026-12-31T00:00:00Z')});
 checkOpportunities(live,'opp live');assert.ok(live.every(opportunity=>opportunity.unknowns.length>=0));
 assert.ok(live[0].unknowns.some(unknown=>unknown.includes('窗口已结束')));

 // Bilingual rendering without changing the Opportunity contract.
 assert.equal(localized('中文','English',true),'中文');assert.equal(localized('中文','English',false),'English');
 for(const opportunity of [pair[0],promotion[0],missingGap[0]]){
  const zh=renderOpportunityText(opportunity,true),en=renderOpportunityText(opportunity,false);
  assert.ok(/[\u4e00-\u9fa5]/.test(zh.title+zh.claim),'zh text');
  assert.ok(/[A-Za-z]/.test(en.title+en.claim),'en text');
  assert.ok(en.title.length>0&&en.claim.length>0,'en non-empty');
  assert.notEqual(zh.title,en.title,'titles differ by language');
  assert.notEqual(zh.claim,en.claim,'claims differ by language');
 }

 // Both categories must survive the server cap and the two-card desktop overview.
 const crowded=buildOpportunities({signals:[
  ...divergent,...rateOnly,...single,
  signal('gap_window','medium','2026-11-19','2026-11-21',{value:3}),
  signal('gap_window','medium','2026-11-23','2026-11-25',{value:3}),
 ]});
 checkOpportunities(crowded,'balanced server cap');
 assert.equal(crowded.length,3);
 assert.equal(crowded.filter(item=>item.kind==='risk').length,2);
 assert.equal(crowded.filter(item=>item.kind==='opportunity').length,1,'higher severity risks cannot consume every slot');
 const featured=selectPriorityOpportunities(crowded,2);
 assert.deepEqual(new Set(featured.map(item=>item.kind)),new Set(['risk','opportunity']),'two-card overview retains both categories');
 assert.ok(featured.every(item=>crowded.includes(item)),'selection preserves original object, actions and reference IDs');
 assert.deepEqual(selectPriorityOpportunities(crowded,1),[crowded[0]],'single slot keeps highest-priority valid candidate');
 assert.deepEqual(selectPriorityOpportunities(crowded,0),[]);
 const legacy=[...five,...sorted,...crowded];
 const legacyBefore=legacy.map(item=>item.id);
 const selectedLegacy=selectPriorityOpportunities(legacy);
 assert.equal(new Set(selectedLegacy.map(item=>item.basis[0].kind)).size,selectedLegacy.length,'stored duplicate families are filtered too');
 assert.deepEqual(legacy.map(item=>item.id),legacyBefore,'selection must not reorder the persisted run');
 const noEvidence={...crowded[0],basis:[]};
 const nonFinite={...crowded[0],basis:[{...crowded[0].basis[0],metric:{name:'missing',unit:'pct',value:NaN}}]};
 const partialPair={...pair[0],basis:pair[0].basis.map((item,index)=>index?{...item,metric:{...item.metric,value:null}}:item)};
 assert.deepEqual(selectPriorityOpportunities([noEvidence,nonFinite,partialPair]),[],'empty, invalid and incomplete price/volume evidence stays out of priority cards');
 for(const value of [null,0,NaN,Infinity]){
  const invalidPair={...pair[0],basis:pair[0].basis.map((item,index)=>index?item:{...item,baseline:{...item.baseline,value}})};
  const invalidPace={...diagnosis[0],basis:diagnosis[0].basis.map(item=>({...item,baseline:{...item.baseline,value}}))};
  assert.deepEqual(selectPriorityOpportunities([invalidPair,invalidPace]),[],`missing or invalid comparison baseline ${value} cannot support a priority card`);
  for(const zh of [true,false]){
   const copy=renderOpportunityText(invalidPair,zh),paceCopy=renderOpportunityText(invalidPace,zh);
   assert.ok(!/NaN|Infinity/.test(JSON.stringify([copy,paceCopy])),'legacy cards never render invalid percentage calculations');
   assert.ok(zh?copy.title.includes('暂不可比'):copy.title.includes('cannot be compared'),'legacy price card acknowledges missing comparison');
   assert.ok(zh?paceCopy.claim.includes('暂无法判断'):paceCopy.claim.includes('cannot be judged'),'legacy pace card acknowledges missing comparison');
  }
 }
 assert.deepEqual(selectPriorityOpportunities([{...pair[0],basis:pair[0].basis.slice(0,1)}]),[],'one half of a price/volume pair is insufficient');
 assert.deepEqual(selectPriorityOpportunities([{...pair[0],basis:pair[0].basis.map((item,index)=>index?{...item,window:gapWindow}:item)}]),[],'price and volume must refer to the same window');
 assert.equal(buildOpportunities({signals:single}).length,1,'current channel concentration remains supported without a prior baseline');
 assert.equal(buildOpportunities({signals:[actionableGap]}).length,1,'open-room availability remains supported without a prior baseline');
 const onlyRisks=buildOpportunities({signals:[...divergent,...rateOnly,...single]});
 assert.equal(onlyRisks.length,3,'a category is not invented when all supported candidates are risks');
 assert.ok(onlyRisks.every(item=>item.kind==='risk'));
 assert.equal(allEmpty.length,5,'missing-data detector signals remain available to the evidence panel');
 console.log('PASS decisions: 5 detectors x trigger/no-trigger/insufficient(null), empty & all-null data, month/year boundaries, channel concentration, gap 3 vs 2 nights, evidenceIds, THRESHOLDS, detectAll, balanced risk/opportunity selection, family dedupe, stored runs, missing-evidence filtering, stable plan/promotion references, data/market/promotion/diagnosis targets, overlap filtering, localized bilingual rendering.');
} catch (error) { console.error(error); process.exitCode = 1; }
