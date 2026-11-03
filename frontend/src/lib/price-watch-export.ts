import type {PriceWatch} from "./competitor-observations.ts";

// Export the same read model as the page: never revive stale/failed prices.
export function priceWatchCsv(watch:PriceWatch):string {
 const labels:Record<string,string>={observed:"已获取参考价",missing:"未获取",conflicting:"报价冲突",not_accepting:"页面提示不接受预订",login_required:"需要登录",verification_required:"需要人工验证",stale:"记录已过期",page_timeout:"采集超时",browser_unavailable:"采集浏览器不可用",not_collected:"本次未获取",collection_failed:"读取失败"};
 const cell=(value:unknown)=>{
  let text=value===null||value===undefined?"":String(value);
  // CSV quoting does not prevent spreadsheet formula execution.
  if(/^[\s\uFEFF]*[=+@-]/.test(text)&&typeof value!=="number")text="'"+text;
  return `"${text.replaceAll('"','""')}"`;
 };
 const rows:unknown[][]=[["酒店","平台","入住日期","晚数","间数","成人","儿童","账号口径","价格类型","当前参考价(CNY)","当前状态","采集时间(UTC)","最近任务结束(UTC)","同口径较上次变化(CNY)","上次成功价(CNY)","上次成功时间(UTC)","房型","早餐","退改","税费","可直接比价","来源","人工核验结果(待填写)","核验人(待填写)","核验时间(待填写)","备注(待填写)"]];
 for(const r of watch.rows)rows.push([r.hotelName,"携程",r.stayDate,1,1,2,0,r.member?"会员会话":"未登录","日历参考价",r.amount,labels[r.status]||r.status,r.capturedAt,r.attemptAt,r.change,r.lastGood?.amount,r.lastGood?.capturedAt,"未获取","未获取","未获取","未获取","否",r.sourceUrl,"","","",""]);
 return "\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n")+"\r\n";
}
