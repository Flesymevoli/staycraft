import type {DecisionAgentRun,ReportSection,ReportClaim} from './decision-agent-types';
// A deterministic recovery path: every displayed number comes from a saved snapshot.
export function evidenceReport(run:DecisionAgentRun,language:'zh'|'en'):DecisionAgentRun{
 const zh=language==='zh',t=(cn:string,en:string)=>zh?cn:en,sections:ReportSection[]=[];
 const metric=run.snapshots?.find(s=>s.evidence.kind==='metrics');
 if(!metric)throw Error('report_evidence_missing');
 const m=metric.data,claim=(path:string,value:number):ReportClaim=>({evidenceId:metric.evidence.id,path,value});
 const paragraphs=[t(`本次记录覆盖 ${run.period.start} 至 ${run.period.end}。以下按已保存订单与启用房量整理，未调用 AI。`,`These saved records cover ${run.period.start} to ${run.period.end}. This report uses recorded bookings and active room capacity without AI.`)],claims:ReportClaim[]=[];
 for(const [key,cn,en,unit] of [['bookedRoomNights','已订','Booked','nights'],['availableRoomNights','尚可售','Available','nights'],['bookedAmountCny','已订金额','Booked value','money']] as const){const v=m[key];if(typeof v!=='number')continue;claims.push(claim(key,v));paragraphs.push(unit==='money'?t(`${cn} ¥${v}，这是预订金额，不是已完成住宿收入、实收或利润。`,`${en}: ¥${v}. This is booking value, not completed revenue, cash received or profit.`):t(`${cn} ${v} 间夜。`,`${en}: ${v} room nights.`));}
 paragraphs.push(t('优先核对空余日期的房态与房源展示，再选择推广日期；不要只凭空房数量判断当地需求。','Review availability and listing details before choosing promotion dates. Vacancy alone does not establish local demand.'));
 sections.push({title:t('预订与可售房量','Bookings and available capacity'),paragraphs,evidenceIds:[metric.evidence.id],claims});
 for(const snapshot of run.snapshots||[]){
  if(snapshot.evidence.kind==='market'&&Array.isArray(snapshot.data.hotels)){
   const prices=snapshot.data.hotels.flatMap((hotel,index)=>hotel&&typeof hotel.price==='number'&&hotel.currency==='CNY'?[{hotel,index}]:[]).slice(0,5);
   if(prices.length)sections.push({title:t('已保存的周边报价参考','Saved nearby quote references'),paragraphs:[t(`报价对应 ${snapshot.data.start} 入住，${snapshot.data.end} 离店。`,`Quotes are for check-in ${snapshot.data.start}, check-out ${snapshot.data.end}.`),...prices.map(({hotel})=>`${hotel.name}: ¥${hotel.price}`),t('逐条核对房型、餐食及取消条件，再与本店报价比较。当前报价不能证明市场均价、需求变化或最佳定价；结合上节可售房量决定是否补充调研。','Check room type, meals and cancellation terms before comparing with your rates. These quotes do not establish market averages, demand trends or optimal prices. Use available capacity above to decide whether more research is needed.')],evidenceIds:[snapshot.evidence.id,metric.evidence.id],claims:prices.map(({hotel,index})=>({evidenceId:snapshot.evidence.id,path:`hotels.${index}.price`,value:hotel.price}))});
  }
 }
 const summary=t('先核对可售日期和房源展示，再安排推广。本文为已保存数据的规则整理，未进行 AI 创意分析。','Review available dates and listing details before planning promotion. This report organizes saved data using rules, without AI analysis.');
 return {...run,language,engine:'rules_v1',phase:'complete',status:'limited',summary,errorCode:undefined,reportDraft:undefined,report:{version:1,title:t('经营数据报告 · 规则整理','Operating data report · Rule based'),period:run.period,updatedAt:run.generatedAt,summary,sections,recommendations:[],uncertainties:[t('仅覆盖系统已记录订单；未导入的渠道及未来变动不在本次快照内。','Only recorded orders are covered; unimported channels and future changes are outside this snapshot.')]}};
}
