import type {SupabaseClient} from '@supabase/supabase-js';
import type {AgentPeriod} from './decision-agent-types';

const DAY=86400000;
const shift=(value:string,days:number)=>new Date(Date.parse(value)+days*DAY).toISOString().slice(0,10);
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const round=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
export type RevenueBucket={amountCents:number;amountCny:number;roomNights:number;averageRateCny:number|null};
type MutableBucket={amountCents:number;roomNights:number};
const empty=():MutableBucket=>({amountCents:0,roomNights:0});
const expose=(b:MutableBucket):RevenueBucket=>({...b,amountCny:b.amountCents/100,averageRateCny:b.roomNights?round(b.amountCents/100/b.roomNights):null});
const add=(b:MutableBucket,cents:number)=>{b.amountCents+=cents;b.roomNights++;if(!Number.isSafeInteger(b.amountCents))throw Error('revenue_amount_overflow');};
type Split={completed:MutableBucket;futureBooked:MutableBucket;uncompletedPast:MutableBucket};
const split=():Split=>({completed:empty(),futureBooked:empty(),uncompletedPast:empty()});
const exposeSplit=(b:Split)=>({completed:expose(b.completed),futureBooked:expose(b.futureBooked),uncompletedPast:expose(b.uncompletedPast)});
export type RevenueSourceRow=Record<string,unknown>;
function cents(value:unknown){
 if(typeof value!=='number'&&typeof value!=='string')throw Error('revenue_amount_missing');
 const raw=String(value);if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw))throw Error('revenue_amount_invalid');
 const [whole,fraction='']=raw.split('.');const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('revenue_amount_invalid');return amount;
}
/** Input must include every recorded order overlapping current AND previous periods. */
export function aggregateRevenue(rows:readonly RevenueSourceRow[],period:AgentPeriod,today:string,coverage:{complete:boolean;expectedCount?:number}={complete:true}){
 if(!validDate(period.start)||!validDate(period.end)||!validDate(today)||period.end<period.start||(Date.parse(period.end)-Date.parse(period.start))/DAY>=60)throw Error('revenue_period_invalid');
 if(!coverage.complete||coverage.expectedCount!==undefined&&coverage.expectedCount!==rows.length)throw Error('revenue_incomplete_rows');
 const length=(Date.parse(period.end)-Date.parse(period.start))/DAY+1;
 const previousPeriod={start:shift(period.start,-length),end:shift(period.start,-1)};
 const current=split(),previous=split(),dates=new Map<string,Split>(),types=new Map<string,Split>(),channels=new Map<string,Split>(),previousTypes=new Map<string,Split>();
 for(let d=period.start;d<=period.end;d=shift(d,1))dates.set(d,split());
 let excludedCancelled=0,pendingCancellationOrders=0,completedStatusInFuture=0,previousRecordedOrders=0,currentRecordedOrders=0;const ids=new Set<string>();
 const bump=(map:Map<string,Split>,key:string,kind:keyof Split,value:number)=>{let row=map.get(key);if(!row){row=split();map.set(key,row)}add(row[kind],value)};
 for(const row of rows){
  if(typeof row.id!=='string'||!row.id||ids.has(row.id))throw Error('revenue_duplicate_or_missing_id');ids.add(row.id);
  if(!validDate(row.arrival)||!validDate(row.departure)||row.departure<=row.arrival||(Date.parse(row.departure)-Date.parse(row.arrival))/DAY>30)throw Error('revenue_invalid_stay');
  const snapshot=row.external_snapshot&&typeof row.external_snapshot==='object'?row.external_snapshot as Record<string,unknown>:null;
  if(snapshot?.currency!==undefined&&snapshot.currency!=='CNY')throw Error('revenue_currency_unsupported');
  if(row.status==='cancelled'||snapshot?.status==='cancelled'){excludedCancelled++;continue;}
  if(row.status!=='confirmed')throw Error('revenue_status_unknown');
  const amount=cents(row.total),nights=(Date.parse(row.departure)-Date.parse(row.arrival))/DAY;
  const completed=row.stay_state==='completed'||snapshot?.status==='completed';
  if(completed&&row.departure>today)completedStatusInFuture++;
  if(row.refund_result==='review_pending')pendingCancellationOrders++;
  if(row.arrival<=period.end&&row.departure>period.start)currentRecordedOrders++;
  if(row.arrival<=previousPeriod.end&&row.departure>previousPeriod.start)previousRecordedOrders++;
  const type=typeof row.type_name==='string'&&row.type_name.trim()?row.type_name:'未记录房型';
  const channel=typeof row.external_channel==='string'&&row.external_channel.trim()?row.external_channel:'direct';
  for(let d=row.arrival,index=0;d<row.departure;d=shift(d,1),index++){
   if(d<previousPeriod.start||d>period.end)continue;
   // The same integer-cent allocation as revenue-source/revenueDays; no per-day floating point drift.
   const value=Math.floor(amount/nights)+(index<amount%nights?1:0);
   const kind:keyof Split=d>=today?'futureBooked':completed?'completed':'uncompletedPast';
   // A completed status on a future stay is inconsistent and cannot be a confirmed future sale.
   if(d>=today&&completed)continue;
   if(d<period.start){add(previous[kind],value);bump(previousTypes,type,kind,value);continue;}
   add(current[kind],value);bump(dates,d,kind,value);bump(types,type,kind,value);bump(channels,channel,kind,value);
  }
 }
 const comparable=period.end<today&&previous.completed.roomNights>0&&current.completed.roomNights>0&&previous.uncompletedPast.roomNights===0&&current.uncompletedPast.roomNights===0&&completedStatusInFuture===0;
 const currentComplete=expose(current.completed),previousComplete=expose(previous.completed);
 const delta= current.completed.amountCents-previous.completed.amountCents;
 const volumeEffectCents=comparable?Math.round((current.completed.roomNights-previous.completed.roomNights)*previous.completed.amountCents/previous.completed.roomNights):null;
 const comparison={available:comparable,previousPeriod,previousCompleted:previousComplete,
  reason:comparable?'同长度已结束周期的已记录订单比较；渠道覆盖可能不完整，分解为恒等式而非因果证明':period.end>=today?'本期包含当前或未来住宿日，不能与完整过去周期比较':!previous.completed.roomNights?'前周期缺少已完成订单，无法区分无业务与未导入数据':!current.completed.roomNights?'本期缺少已完成订单，无法计算成交均价':previous.uncompletedPast.roomNights||current.uncompletedPast.roomNights?'存在未完成状态的历史订单，暂不计算周期变化':'完成状态与未来日期冲突',
  amountChangeCents:comparable?delta:null,amountChangeCny:comparable?delta/100:null,
  amountChangePct:comparable?round(delta/previous.completed.amountCents*100):null,
  roomNightsChange:comparable?current.completed.roomNights-previous.completed.roomNights:null,
  roomNightsChangePct:comparable?round((current.completed.roomNights/previous.completed.roomNights-1)*100):null,
  averageRateChangeCny:comparable?round(current.completed.amountCents/100/current.completed.roomNights-previous.completed.amountCents/100/previous.completed.roomNights):null,
  decomposition:comparable?{volumeEffectCents,volumeEffectCny:volumeEffectCents!/100,rateAndMixEffectCents:delta-volumeEffectCents!,rateAndMixEffectCny:(delta-volumeEffectCents!)/100,method:'Δ收入 = (本期间夜−前期间夜)×前期均价 + 本期间夜×(本期均价−前期均价)。均价项包含房型/渠道结构变化，不等于单独调价效果。'}:null,
  roomTypeChanges:comparable?[...new Set([...types.keys(),...previousTypes.keys()])].map(name=>{const a=types.get(name)?.completed||empty(),b=previousTypes.get(name)?.completed||empty();return {name,current:expose(a),previous:expose(b),amountChangeCents:a.amountCents-b.amountCents,amountChangeCny:(a.amountCents-b.amountCents)/100}}):[]};
 const shares=(value:Split)=>({completedSharePct:current.completed.amountCents>0?round(value.completed.amountCents/current.completed.amountCents*100):null,futureBookedSharePct:current.futureBooked.amountCents>0?round(value.futureBooked.amountCents/current.futureBooked.amountCents*100):null});
 const ranked=(map:Map<string,Split>)=>[...map].map(([name,value])=>({name,...exposeSplit(value),...shares(value)})).sort((a,b)=>b.completed.amountCents+b.futureBooked.amountCents-a.completed.amountCents-a.futureBooked.amountCents);
 return {currency:'CNY' as const,basis:'confirmed订单，住宿日期含入住不含离店；整数分摊房费。已完成房费与未来预订分开；不代表实收、净收入或利润。',period,today,
  totals:{...exposeSplit(current),recordedOrders:currentRecordedOrders},
  breakdowns:{dates:[...dates].map(([date,value])=>({date,...exposeSplit(value),...shares(value)})),roomTypes:ranked(types),channels:ranked(channels)},comparison,
  quality:{completeRecordedRows:true,readRows:rows.length,previousRecordedOrders,excludedCancelled,pendingCancellationOrders,completedStatusInFuture,
   partialChannelCoverage:true,refundAmountsAvailable:false,netRevenueCny:null,cashReceivedCny:null,profitCny:null,
   notes:['完整性仅覆盖系统已记录订单，不代表全部渠道已导入。','取消订单已排除；取消/退款审批状态不是退款金额，无法计算净退款或实收。',...(pendingCancellationOrders?['待取消审核订单仍按当前confirmed状态统计，金额可能变化。']:[]),...(completedStatusInFuture?['存在未来日期已完成状态，相关未来间夜不计入已完成或未来预订。']:[])]},
  keyMetrics:[{key:'completedRoomRevenue',label:'已完成住宿房费',value:currentComplete.amountCny,unit:'CNY'},{key:'completedRoomNights',label:'已完成售出间夜',value:currentComplete.roomNights,unit:'间夜'},{key:'completedADR',label:'已完成成交均价',value:currentComplete.averageRateCny,unit:'CNY/间夜'},{key:'futureBookingValue',label:'未来预订金额',value:current.futureBooked.amountCents/100,unit:'CNY'}]};
}
export type AgentRevenue=ReturnType<typeof aggregateRevenue>;
export async function readAgentRevenue(db:SupabaseClient,propertyId:string,period:AgentPeriod,signal?:AbortSignal):Promise<AgentRevenue>{
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 if(!validDate(period.start)||!validDate(period.end)||period.end<period.start)throw Error('revenue_period_invalid');
 const length=(Date.parse(period.end)-Date.parse(period.start))/DAY+1;if(length>60)throw Error('revenue_period_invalid');
 const rows:RevenueSourceRow[]=[],start=shift(period.start,-length);let expected:number|null=null;
 for(let offset=0;offset<10000;offset+=1000){
  const request=db.from('direct_bookings').select('id,type_name,arrival,departure,total,status,stay_state,external_channel,external_snapshot,refund_result',{count:'exact'}).eq('property_id',propertyId).lte('arrival',period.end).gt('departure',start).order('id').range(offset,offset+999);
  const {data,error,count}=await request.abortSignal(signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000));
  if(error||!Array.isArray(data)||count===null||count>10000||(expected!==null&&expected!==count))throw Error('revenue_unavailable');
  expected=count;rows.push(...data);if(rows.length===expected)break;
  if(data.length!==1000)throw Error('revenue_incomplete_rows');
 }
 if(rows.length!==expected)throw Error('revenue_incomplete_rows');
 return aggregateRevenue(rows,period,today,{complete:true,expectedCount:expected});
}
