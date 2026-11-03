import type {BookingMetrics} from '@/components/booking-metrics';

// A small test scenario, never an optimum-rate claim or a write to room prices.
export function pricingAdvice(data:BookingMetrics,zh:boolean){
 const t=(en:string,cn:string)=>zh?cn:en;
 const validRates=typeof data.rate_min==='number'&&Number.isFinite(data.rate_min)&&data.rate_min>0&&typeof data.rate_max==='number'&&Number.isFinite(data.rate_max)&&data.rate_max>=data.rate_min;
 const evidence=t(`Recorded booking occupancy: ${data.booked_pct??'—'}%. Channel coverage may be incomplete; comparable competitor quotes and cost floors are not established.`,`已记录预订占用率 ${data.booked_pct??'—'}%。渠道可能不完整，尚无同口径竞品报价和成本底价依据。`);
 const hold={id:'pricing',title:t('Pricing suggestion · hold for now','调价建议 · 暂时维持'),evidence,action:t('Keep current rates while checking channel coverage, comparable quotes and your cost floor. Do not change prices from an empty or historical sample.','先维持现价，补齐渠道订单、同口径报价和成本底价；空样本或历史房量未知时不据此调价。'),href:'/app/analysis'};
 if(!validRates||data.historical_inventory_unknown||!data.active_rooms||!data.booked_order_room_nights||data.booked_pct===null||data.booked_pct<0||data.booked_pct>100||data.available_room_nights<=0)return hold;
 const direction=data.booked_pct<=30?-1:data.booked_pct>=80?1:0;
 if(!direction)return {...hold,action:t('Current recorded bookings alone do not support a clear increase or decrease. Keep rates and review unbooked dates separately.','当前记录不足以支持明确涨跌，建议维持现价，单独查看仍有空房的日期。')};
 const factor=direction<0?.95:1.05,lo=Math.round(data.rate_min!*factor),hi=Math.round(data.rate_max!*factor),range=lo===hi?`¥${lo}`:`¥${lo}–${hi}`;
 return {id:'pricing',title:direction<0?t('Pricing suggestion · optional 5% lower trial','调价建议 · 可选小幅试降5%'):t('Pricing suggestion · optional 5% higher trial','调价建议 · 可选小幅试涨5%'),evidence,
 action:t(`If all-channel bookings confirm this pattern, test ${range}/night on a few unbooked dates using current room-type list prices as the basis. This is a fixed 5% experiment, not a market valuation. Confirm your minimum viable rate first; keep booked orders unchanged and compare new bookings before extending the trial.`,`若补齐全渠道订单后仍是这一分布，可仅对少量未订日期试用 ${range}/晚（按当前不同房型挂牌价统一${direction<0?'下调':'上调'}5%估算）。这只是试价方案，不是最优价；先确认不低于成本底价，已订订单不动，观察新增预订后再决定是否扩大。`),href:'/app/analysis'};
}
