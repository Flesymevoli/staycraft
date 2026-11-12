// Owner-facing labels for deterministic metric identifiers. Detectors emit stable machine
// names; the UI must not show raw identifiers such as `consecutive_open_nights`.
export const METRIC_LABELS: Record<string, [string, string]> = {
  booked_pct: ['预订进度', 'Booked rate'],
  consecutive_open_nights: ['连续可售晚数', 'Consecutive open nights'],
  open_room_nights: ['可售间夜', 'Available room-nights'],
  cancellation_rate: ['取消率', 'Cancellation rate'],
  top_channel_share: ['单一渠道占比', 'Top channel share'],
  average_price: ['平均成交价', 'Average price'],
  room_nights: ['间夜', 'Room nights'],
  booking_pace: ['预订进度', 'Booking pace'],
};

export function metricLabel(name: string, zh: boolean): string {
  const hit = METRIC_LABELS[name];
  return hit ? hit[zh ? 0 : 1] : name;
}

export function metricUnit(name:string,unit:string|undefined,zh:boolean):string {
  if(name==='consecutive_open_nights')return zh?' 晚':' nights';
  if(unit==='pct')return '%';
  if(unit==='room_nights')return zh?' 间夜':' room-nights';
  if(unit==='cny')return zh?' 元':' CNY';
  return '';
}

const CHANNELS: Record<string, [string, string]> = {
  direct: ['直客', 'Direct'],
  ctrip: ['携程', 'Ctrip'],
  meituan: ['美团', 'Meituan'],
  fliggy: ['飞猪', 'Fliggy'],
  douyin: ['抖音', 'Douyin'],
  xiaohongshu: ['小红书', 'Xiaohongshu'],
};

export function channelLabel(value: string, zh: boolean): string {
  const hit = CHANNELS[value.trim().toLowerCase()];
  return hit ? hit[zh ? 0 : 1] : value;
}
