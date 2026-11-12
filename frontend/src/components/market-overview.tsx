"use client";
import {DesktopPageToolbar} from './desktop-page-toolbar';
import {useDesktopSurface} from './desktop-surface';
import {workspaceDay} from '@/lib/demo-period';

import {useEffect, useId, useState} from 'react';
import type {MarketSample, Quote} from '@/lib/market/types';
import {countableQuote, dailyMedian, hotelKey, marketDates, marketRows} from '@/lib/market/presentation';
import {buildMarketSample} from '@/lib/market/sample';
import {DesktopCollection} from './desktop-collection';
import {GeminiMarketOverview} from './gemini-market-overview';
import './market-overview.css';

type Payload = {
 sample: MarketSample;
 ownRates: {min: number; max: number} | null;
 dataMode: 'fictional_demo' | 'collected_ctrip_snapshot' | 'live';
 snapshot?: {locationStatus?: 'matched'|'changed'|'unknown';status: string; capturedAt: string | null; hotels: number; nights: number; batchWindow?: Range};
 listDisplayPrices?: {capturedAt: string; advertisedCount?: number; rows: {name: string; priceCny: number}[]} | null;
};
type Range = {start: string; end: string};
const DAY = 86400000;
const shift = (day: string, offset: number) => new Date(Date.parse(day + 'T00:00:00Z') + offset * DAY).toISOString().slice(0, 10);
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
const money = (value: number | null | undefined) => value == null ? '—' : '¥' + Math.round(value).toLocaleString('en-US');
const STATUS: Record<string, {zh: string; en: string}> = {
 available: {zh: '可售', en: 'Available'}, no_saleable: {zh: '无可售', en: 'No availability'},
 missing: {zh: '未采集', en: 'Not captured'}, source_error: {zh: '来源异常', en: 'Source error'},
 unknown: {zh: '状态未知', en: 'Unknown'}, stale: {zh: '延迟报价', en: 'Delayed quote'},
};
const statusLabel = (status: string, zh: boolean) => (STATUS[status] ?? STATUS.unknown)[zh ? 'zh' : 'en'];
const safeSource = (url?: string) => {
 try { const parsed = new URL(url || ''); return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : undefined; } catch { return undefined; }
};
const capturedLabel = (value: string | null | undefined, zh: boolean) => {
 if (!value || !Number.isFinite(Date.parse(value))) return zh ? '未提供' : 'Not provided';
 return new Intl.DateTimeFormat(zh ? 'zh-CN' : 'en-GB', {timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(value));
};

function WeeklyPriceChart({days, zh}: {days: {date: string; median: number | null}[]; zh: boolean}) {
 const values = days.flatMap(({median}) => median === null ? [] : [median]);
 if (!values.length) return null;
 const min = Math.min(...values);
 const max = Math.max(...values);
 const padding = Math.max(10, (max - min) * 0.15);
 const low = Math.max(0, min - padding);
 const high = max + padding;
 const y = (value: number) => 134 - ((value - low) / (high - low)) * 106;
 const points = days.map(({date, median}, index) => ({
  date, median, x: 28 + (344 * index) / Math.max(1, days.length - 1),
  y: median === null ? null : y(median),
 }));
 const line = points.map((point, index) => point.y === null ? '' :
  `${points[index - 1]?.y != null ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
 const title = zh ? '七日价格浮动' : 'Seven-day price comparison';
 return <section className="mo-prices">
  <div className="mo-section-head"><h3>{title}</h3><span>{zh ? '样本中位数 · 元 / 晚' : 'Sample median · CNY / night'}</span></div>
  <svg className="mo-price-chart" viewBox="0 0 400 164" role="img" aria-label={title}>
   <desc>{points.map(({date, median}) => `${date} ${median === null ? (zh ? '样本不足' : 'insufficient quotes') : money(median)}`).join(' · ')}</desc>
   {[28, 81, 134].map(level => <line key={level} className="mo-chart-grid" x1="16" x2="384" y1={level} y2={level}/>)}
   <path className="mo-chart-line" d={line}/>
   {points.map(point => <g key={point.date}>
    {point.y !== null && <>
     <circle className="mo-chart-point" data-weekend={[0,6].includes(new Date(point.date+"T12:00:00Z").getUTCDay())||undefined} cx={point.x} cy={point.y} r="3.5"/>
     <text className="mo-chart-value" x={point.x} y={point.y - 10}>{money(point.median)}</text>
    </>}
    <text className="mo-chart-date" x={point.x} y="154">{point.date.slice(5).replace('-', '/')}</text>
   </g>)}
  </svg>
  <p className="mo-comparison-note">{zh ? '按不同入住日比较，每天至少 3 家有效报价。样本不足处留空。' : 'Compares check-in dates with at least three valid quotes. Gaps indicate insufficient data.'}</p>
 </section>;
}

function MarketRateAdvice({sample, ownRates, zh}: {sample: MarketSample; ownRates?: Payload['ownRates']; zh: boolean}) {
 const t = (cn: string, en: string) => zh ? cn : en;
 const {p25Cny: low, p75Cny: high, medianCny: median} = sample.stats;
 let conclusion: string;
 let action: string;
 if (sample.comparability === 'none' || low === null || high === null || median === null) {
  conclusion = t('样本不足，先不据此调价', 'Too few quotes to guide a rate change');
  action = t('至少需要同一入住日的 3 家有效报价。', 'At least three stays with valid quotes for the same check-in date are needed.');
 } else if (!ownRates || !Number.isFinite(ownRates.min) || !Number.isFinite(ownRates.max) || ownRates.min <= 0 || ownRates.max < ownRates.min) {
  conclusion = t('补齐本店挂牌价后再比较', 'Add your listed rates to compare');
  action = t('在「我的」中维护房型价格，即可查看本店在样本中的位置。', 'Set room rates in My property to see how they compare.');
 } else if (ownRates.min > high) {
  conclusion = t('本店挂牌价高于周边样本价带', 'Your listed rates are above the sample band');
  action = t(`本店最低挂牌价 ${money(ownRates.min)}，周边样本中位数 ${money(median)}。如果当天还有空房，优先挑一款同档房型小幅试降，观察新增预订。`,
   `Your lowest listed rate is ${money(ownRates.min)} and the sample median is ${money(median)}. If rooms are still open, try a small reduction on one comparable room type and watch for new bookings.`);
 } else if (ownRates.max < low) {
  conclusion = t('本店挂牌价低于周边样本价带', 'Your listed rates are below the sample band');
  action = t(`本店最高挂牌价 ${money(ownRates.max)}，周边样本中位数 ${money(median)}。如果当天已接近订满，可挑一款仍有空房的同档房型小幅试涨。`,
   `Your highest listed rate is ${money(ownRates.max)} and the sample median is ${money(median)}. If the date is nearly booked, try a small increase on one comparable room type with availability.`);
 } else {
  conclusion = t('本店挂牌价与周边样本价带有重叠', 'Your listed rates overlap the sample band');
  action = t(`周边样本中位数为 ${money(median)}。优先关注当天空房较多的房型，再按同档报价决定是否单独调价。`,
   `The sample median is ${money(median)}. Start with the room types with the most availability and use comparable quotes to decide whether to adjust them individually.`);
 }
 return <section className="mo-rate-advice" aria-label={t('调价建议', 'Rate recommendation')}>
  <span>{t('调价建议', 'Rate recommendation')}</span>
  <h3>{conclusion}</h3>
  <p>{action}</p>
 </section>;
}

function QuoteDetail({quote, zh, onClose, id}: {quote: Quote; zh: boolean; onClose: () => void; id: string}) {
 const t = (cn: string, en: string) => zh ? cn : en;
 const unknown = t('未提供', 'Not provided');
 const condition = (value: boolean | undefined) => value === undefined ? unknown : value ? t('是', 'Yes') : t('否', 'No');
 const source = safeSource(quote.sourceUrl);
 return <section className="mo-detail" id={id} aria-label={t('报价详情', 'Quote details')}>
  <div className="mo-detail-head"><div><h4>{quote.sourceName}</h4><p>{quote.stayDate} · {t('入住', 'check-in')} · {money(quote.priceCny)}{t(' / 晚', ' / night')}</p></div><button type="button" className="mo-text-button" onClick={onClose}>{t('收起详情', 'Close details')}</button></div>
  <dl className="mo-detail-grid">
   <div><dt>{t('报价类型', 'Price type')}</dt><dd>{quote.priceType === 'calendar' ? t('日历参考价', 'Calendar reference') : quote.priceType === 'display' ? t('展示价 · 不计统计', 'Display price · excluded') : quote.priceType === 'plan' ? t('房价方案', 'Rate plan') : t('起价', 'Starting price')}</dd></div>
   <div><dt>{t('入住条件', 'Stay conditions')}</dt><dd>{t(`${quote.nights} 晚 · ${quote.adults} 位成人`, `${quote.nights} night(s) · ${quote.adults} adult(s)`)}</dd></div>
   <div><dt>{t('房型 / 档位', 'Room / class')}</dt><dd>{[quote.roomType, quote.roomClass].filter(Boolean).join(' / ') || unknown}</dd></div>
   <div><dt>{t('早餐 / 可退款 / 含税', 'Breakfast / refundable / tax included')}</dt><dd>{condition(quote.breakfast)} / {condition(quote.refundable)} / {condition(quote.taxesIncluded)}</dd></div>
   <div><dt>{t('采集时间 · 北京时间', 'Captured · China time')}</dt><dd>{capturedLabel(quote.capturedAt, zh)}</dd></div>
   <div><dt>{t('来源状态', 'Source status')}</dt><dd>{statusLabel(quote.status, zh)} · {countableQuote(quote) ? t('计入统计', 'Counted') : t('不计入统计', 'Excluded')}</dd></div>
  </dl>
  {quote.priceChange && <p className="mo-note">{t('同入住日、同条件上次采集', 'Previous collection for the same stay date and conditions')}：{capturedLabel(quote.priceChange.previousCapturedAt, zh)} {t('北京时间', 'China time')} · {money(quote.priceChange.previousPrice)}</p>}
  {quote.note && <p className="mo-note">{quote.note}</p>}
  {source ? <a className="mo-source-link" href={source} target="_blank" rel="noopener noreferrer">{t('打开原始来源', 'Open original source')}<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 3h4v4M7 9l6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></a> : <p className="mo-note">{t('该报价未提供来源链接。', 'No source link was provided for this quote.')}</p>}
 </section>;
}

export function MarketOverview({zh, start,demo=false}: {zh: boolean; start?: string; end?: string; demo?:boolean}) {
 const desktop=useDesktopSurface();
 const t = (cn: string, en: string) => zh ? cn : en;
 const [today] = useState(() => workspaceDay(demo));
 const [requested, setRange] = useState<Range>(() => {
  const first = start && validDay(start) && start >= today ? start : shift(today, 1);
  return {start: first, end: shift(first, 6)};
 });
 const [latestSnapshot,setLatestSnapshot]=useState(demo&&!start);
 const [revision, setRevision] = useState(0);
 const [state, setState] = useState<{key: string; payload?: Payload; error?: string}>({key: ''});
 const [selection, setSelection] = useState<{key: string; quote: Quote} | null>(null);
 const detailId = useId();
 const dailyPricesId = useId();
 const requestKey = `${requested.start}/${requested.end}/${revision}/${latestSnapshot}`;
 // Data is bound to its requested window: changed inputs cannot display previous prices.
 const loading = state.key !== requestKey;
 const payload = loading ? undefined : state.payload;
 const error = loading ? undefined : state.error;
 const range=payload?.sample.window??requested;

 useEffect(() => {
  const refresh = () => setRevision(value => value + 1);
  window.addEventListener('staycraft-market-synced', refresh);
  return () => window.removeEventListener('staycraft-market-synced', refresh);
 }, []);

 useEffect(() => {
  const controller = new AbortController();
  fetch('/api/workspace/market/sample', {method: 'POST', headers: {'Content-Type': 'application/json'}, cache: 'no-store', signal: controller.signal, body: JSON.stringify({...requested,...(latestSnapshot?{latestSnapshot:true}:{})})})
   .then(async response => {
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.sample) throw Error(data?.error || 'market_unavailable');
    if (!controller.signal.aborted) setState({key: requestKey, payload: data});
   })
   .catch(reason => {if (!controller.signal.aborted) setState({key: requestKey, error: reason instanceof Error ? reason.message : 'market_unavailable'});});
  return () => controller.abort();
 }, [requested, latestSnapshot, requestKey]);

 const quotes = payload?.sample.quotes || [];
 const dayQuotes = quotes.filter(quote => quote.stayDate === range.start);
 const sample = payload ? buildMarketSample({quotes: dayQuotes, window: {start: range.start, end: range.start}}) : undefined;
 const weeklyPrices = marketDates(range.start, range.end).slice(0, 7).map(date => ({date, median: dailyMedian(quotes, date)}));
 const rows = marketRows(quotes);
 const nameKey = (name: string) => name.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
 const dailyRows = new Map(rows.map(row => [nameKey(row.name), {name: row.name, quote: row.cells[range.start]}]));
 const listPrices = payload?.listDisplayPrices;
 if (listPrices) for (const row of listPrices.rows) {
  const key = nameKey(row.name);
  if (dailyRows.get(key)?.quote?.priceCny != null) continue;
  dailyRows.set(key, {name: row.name, quote: {
   id: 'list:' + key, source: 'platform', sourceName: row.name, capturedAt: listPrices.capturedAt,
   stayDate: range.start, nights: 1, adults: 1, priceType: 'display', priceCny: row.priceCny, status: 'available',
   note: t('来源：携程搜索结果列表。', 'Source: Ctrip search results.'),
  }});
 }
 const dailyQuotedCount = [...dailyRows.values()].filter(row => row.quote?.priceCny != null).length;
 const counted = dayQuotes.filter(countableQuote);
 const hotelCount = new Set(counted.map(hotelKey)).size;
 const sufficient = Boolean(sample && sample.comparability !== 'none' && hotelCount >= 3);
 const selected = !loading && selection?.key === requestKey ? selection.quote : null;
 const captured = payload?.snapshot?.capturedAt || quotes.map(quote => quote.capturedAt).sort().at(-1);
 const unavailable = payload?.snapshot?.status === 'unavailable';
 const earliest=demo?(payload?.snapshot?.batchWindow?.start??(range.start<today?range.start:today)):today;
 const updateStart = (next: string) => {
  if (!validDay(next) || (!demo&&next<today)) return;
  setSelection(null);
  setLatestSnapshot(false);
  setRange({start: next, end: shift(next, 6)});
 };

 if (desktop) return <GeminiMarketOverview zh={zh} demo={demo} range={range} earliest={earliest}
  loading={loading} error={Boolean(error || unavailable)} sample={sample} ownRates={payload?.ownRates}
  locationStatus={payload?.snapshot?.locationStatus} captured={capturedLabel(captured, zh)} hotelCount={hotelCount}
  sufficient={sufficient} rows={[...dailyRows.values()]} weeklyPrices={weeklyPrices} updateStart={updateStart}
  retry={() => setRevision(value => value + 1)} detail={(quote, id, close) => <QuoteDetail quote={quote} id={id} zh={zh} onClose={close}/>}/>;

 return <section className="mo-panel" id="market-snapshot" aria-busy={loading}>
  <DesktopPageToolbar><header className="mo-head">{!desktop&&<h2>{t('周边住宿报价', 'Nearby stay prices')}</h2>}
   <DesktopCollection zh={zh} demo={demo} onSync={() => setRevision(value => value + 1)} fallback={<span className={`mo-chip ${payload?.dataMode === 'fictional_demo' ? 'mo-demo' : ''}`} aria-hidden={!payload} data-placeholder={!payload}>
    {payload?.dataMode === 'fictional_demo' ? t('虚构演示数据', 'Fictional demo data') : payload?.dataMode === 'collected_ctrip_snapshot' ? t('携程采集快照', 'Ctrip snapshot') : t('已导入快照', 'Imported snapshot')}
   </span>}/>
  </header>
  <div className="mo-range">
   <label><span>{t('入住日期', 'Check-in date')}</span><input type="date" min={earliest} value={range.start} onChange={event => updateStart(event.target.value)}/></label>
   {(!demo||!latestSnapshot)&&<button type="button" className="mo-reset" onClick={() => {setSelection(null);setLatestSnapshot(demo);setRange({start: shift(today, 1), end: shift(today, 7)});}}>{demo?t('回到采集日期','Back to snapshot dates'):t('回到明天', 'Tomorrow')}</button>}
  </div>
  </DesktopPageToolbar>
  {loading ? <div className="mo-state" role="status"><span className="mo-loading-dot" aria-hidden="true"/><h3>{t('正在读取所选日期的报价', 'Loading prices for these dates')}</h3><p>{t('读取已保存的采集快照。', 'Reading the saved collection snapshot.')}</p></div> : error || unavailable ? <div className="mo-state" role="status"><h3>{t('暂时无法读取报价', 'Prices are temporarily unavailable')}</h3><p>{t('读取失败不代表周边没有住宿，稍后可以重试。', 'A failed read does not mean there are no nearby stays. Please retry.')}</p><button type="button" className="mo-reset" onClick={() => setRevision(value => value + 1)}>{t('重新读取', 'Retry')}</button></div> : sample && <>
   {!desktop&&<div className="mo-coverage"><p>{t(`${hotelCount} 家住宿 · ${sample.stats.n} 条有效报价`,`${hotelCount} stays · ${sample.stats.n} valid prices`)}</p><p>{t('采集于', 'Captured')} {capturedLabel(captured, zh)} {t('北京时间','China time')}</p></div>}
   <div className="market-layout-overview">{dayQuotes.length > 0 ? <div className="market-layout-summary">
    {desktop&&<><h2>{t('当日样本统计与调价建议','Daily Sample Stats & Rate Advice')}</h2><p className="desktop-market-capture">{hotelCount} {t('家住宿','stays')} · {sample.stats.n} {t('条有效报价','valid quotes')} · {t('采集于','Captured')} {capturedLabel(captured,zh)}</p></>}
    <div className="mo-summary">
     <div className="mo-metric mo-metric-primary"><span>{t('报价中位数', 'Median quote')}</span><strong>{money(sample.stats.medianCny)}<small>{t('/ 晚', '/ night')}</small></strong></div>
     {sufficient&&<div className="mo-metric"><span>{t('中间 50% 价带', 'Middle 50% of daily prices')}</span><strong>{`${money(sample.stats.p25Cny)}–${money(sample.stats.p75Cny)}`}</strong></div>}
     <div className="mo-metric"><span>{t('本店挂牌价', 'Your listed rates')}</span><strong>{payload?.ownRates ? `${money(payload.ownRates.min)}–${money(payload.ownRates.max)}` : '—'}</strong></div>
    </div>
    <p className="mo-comparison-note">{t('周边为日历参考价，本店为挂牌价。', 'Nearby calendar prices and your listed rates.')}</p>
    {payload?.snapshot?.locationStatus==='matched'?<MarketRateAdvice sample={sample} ownRates={payload?.ownRates} zh={zh}/>:<p className="mo-note" role="status">{payload?.snapshot?.locationStatus==='changed'?t('民宿地址已变更，这批报价属于原采集地点。重新采集后可用于当前民宿的调价判断。','The property address has changed. Collect a new batch to assess rates for the current location.'):t('这批报价未记录采集时的民宿地址，位置尚未核实。','The property address at capture time was not recorded; location is unverified.')}</p>}
   </div> : dailyQuotedCount === 0 && <div className="mo-state mo-state-empty" role="status"><h3>{t('所选日期暂无采集报价', 'No collected quotes for these dates')}</h3><p>{t('可以调整入住日期查看已有快照；未采集不等于没有房源。', 'Choose other dates to explore saved quotes. Missing data does not mean no availability.')}</p></div>}
   <WeeklyPriceChart days={weeklyPrices} zh={zh}/></div>
   <section className="mo-prices" aria-labelledby={dailyPricesId}>
    <div className="mo-section-head"><h3 id={dailyPricesId}>{t('当日住宿报价', 'Stay prices for this date')}</h3><span>{t(`${dailyQuotedCount} 家有报价 · 人民币 / 晚`, `${dailyQuotedCount} stays with prices · CNY / night`)}</span></div>
    {dailyRows.size > 0 &&
     <ul className="mo-day-list">{[...dailyRows].map(([key, {name, quote}]) => {
      const change = quote?.priceChange;
      const isSelected = selected && quote && selected.id === quote.id && selected.stayDate === quote.stayDate && hotelKey(selected) === hotelKey(quote);
      return <li key={key}><div><strong>{name}</strong><span>{quote?.priceCny != null ? t('采集报价', 'Collected quote') : quote ? statusLabel(quote.status, zh) : t('当日未采集', 'Not captured for this date')}</span></div>
       {quote ? <button type="button" className="mo-day-price" aria-pressed={Boolean(isSelected)} aria-controls={detailId} onClick={() => setSelection(isSelected ? null : {key: requestKey, quote})}><strong>{money(quote.priceCny)}{quote.priceType === 'display' && t(' 起', ' and up')}</strong><span>{change ? change.amount === 0 ? t('较上次持平', 'Unchanged') : (change.amount > 0 ? '+' : '−') + money(Math.abs(change.amount)) : t('查看详情', 'View details')}</span></button> : <span className="mo-day-missing">—</span>}
       {desktop&&isSelected&&<QuoteDetail id={detailId} quote={quote!} zh={zh} onClose={() => setSelection(null)}/>}
      </li>;
     })}</ul>}

    {!desktop&&selected&&<QuoteDetail id={detailId} quote={selected} zh={zh} onClose={()=>setSelection(null)}/>}
   </section>
  </>}
 </section>;
}
