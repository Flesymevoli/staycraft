"use client";

import {useContext, useEffect, useId, useState, type ReactNode} from 'react';
import {GuidedDemoContext} from './desktop-surface';
import {DemoCollectButton,useDemoCollection} from './demo-journey';
import {Zap} from 'lucide-react';
import type {MarketSample, Quote} from '@/lib/market/types';
import {countableQuote} from '@/lib/market/presentation';
import {marketInventoryAdvice} from '@/lib/market/rate-advice';
import {marketAverage} from '@/lib/market/sample';
import {useBookingMetrics} from './booking-metrics';
import {WorkbenchDrawer} from './workbench-drawer';
import {DesktopCollection} from './desktop-collection';
import './gemini-market-overview.css';

type Range = {start: string; end: string};
type Props = {
  zh: boolean;
  demo: boolean;
  range: Range;
  earliest: string;
  loading: boolean;
  error: boolean;
  sample?: MarketSample;
  ownRates?: {min: number; max: number; average?: number} | null;
  ownRateSource?: 'orders' | 'settings' | 'settings_order_unavailable';
  orderRateCount?: number;
  locationStatus?: 'matched' | 'changed' | 'unknown';
  captured: string;
  hotelCount: number;
  sufficient: boolean;
  rows: {name: string; quote?: Quote}[];
  weeklyPrices: {date: string; median: number | null}[];
  updateStart: (date: string) => void;
  retry: () => void;
  detail: (quote: Quote, id: string, close: () => void) => ReactNode;
};

const money = (value: number | null | undefined) => value == null ? '—' : `¥${Math.round(value).toLocaleString('en-US')}`;

function MedianChart({days, zh}: {days: Props['weeklyPrices']; zh: boolean}) {
  const values = days.flatMap(day => day.median == null ? [] : [day.median]);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const padding = Math.max(10, (maximum - minimum) * 0.2);
  const bottom = Math.max(0, minimum - padding);
  const top = maximum + padding;
  const points = days.map((day, index) => ({...day, x: 30 + index * 325 / Math.max(1, days.length - 1), y: day.median == null ? null : 125 - (day.median - bottom) / (top - bottom) * 97}));
  const line = points.map((point, index) => point.y == null ? '' : `${points[index - 1]?.y != null ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  return <article className="gm-card gm-chart-card">
    <header><h2>{zh ? '七日中位数价格走势' : '7-Day Sample Median Trend'}</h2><p>{zh ? '元 / 晚 · 黄点为周六及周日' : 'CNY / night · Yellow dots = weekend'}</p></header>
    <svg viewBox="0 0 380 155" role="img" aria-label={zh ? '七日同入住日样本中位数' : 'Seven-day same-date sample medians'}>
      <desc>{points.map(point => `${point.date}: ${money(point.median)}`).join(' · ')}</desc>
      {[30,80,125].map(y => <line key={y} x1="20" x2="360" y1={y} y2={y} className="gm-grid-line"/>)}
      <path d={line} className="gm-price-line"/>
      {points.map(point => {
        const weekday = new Date(point.date + 'T12:00:00Z').getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        return <g key={point.date}>
          {point.y != null && <><circle cx={point.x} cy={point.y} r={weekend ? 5.5 : 3.5} className={weekend ? 'gm-weekend-dot' : 'gm-price-dot'}/><text x={point.x} y={point.y - 11} textAnchor="middle" className="gm-price-value">{money(point.median)}</text></>}
          <text x={point.x} y="144" textAnchor="middle" className="gm-price-date">{point.date.slice(5).replace('-', '/')}</text>
        </g>;
      })}
    </svg>
    {!values.length && <p className="gm-chart-empty">{zh ? '暂无满足 3 家有效报价的日期，采集后显示走势。' : 'No date has three valid quotes yet. Collect prices to show the trend.'}</p>}
    <p className="gm-footnote">{zh ? '每天至少 3 家有效报价；指定入住日的列表起价计入参考统计，缺失和延迟报价除外。' : 'At least three valid stays per day. Dated list prices count as references; missing and delayed quotes are excluded.'}</p>
  </article>;
}

export function GeminiMarketOverview(props: Props) {
  const {zh, demo, range, sample, loading, error, ownRates, locationStatus, rows} = props;
  const t = (cn: string, en: string) => zh ? cn : en;
  const [collecting, setCollecting] = useState(false);
  const guidedDemo=useContext(GuidedDemoContext),{sync:syncDemo}=useDemoCollection();
  const prefix = useId();
  const {data: metrics, status: inventoryStatus} = useBookingMetrics(7, 'market-overview', range);
  const inventory = metrics?.daily.find(day => day.date === range.start);
  const advice = sample ? marketInventoryAdvice({sample, ownRates, inventory: metrics?.historical_inventory_unknown ? null : inventory, zh}) : null;
  const maxPrice = Math.max(1, ...rows.flatMap(row => row.quote?.priceCny == null ? [] : [row.quote.priceCny]));
  const locationMatched = locationStatus === 'matched';

  useEffect(() => {
    const open = () => {if(guidedDemo)void syncDemo();else setCollecting(true);};
    const hash = () => {if (window.location.hash === '#desktop-collection') open();};
    window.addEventListener('staycraft-open-collector', open);
    window.addEventListener('hashchange', hash);
    // Handle links from a different page after the drawer listener is ready.
    const timer = window.setTimeout(hash, 0);
    return () => {window.clearTimeout(timer); window.removeEventListener('staycraft-open-collector', open); window.removeEventListener('hashchange', hash);};
  }, [guidedDemo,syncDemo]);

  return <section className="gemini-market" aria-busy={loading}>
    <header className="gm-page-header">
      <div><h1>{t('周边市场报价调研', 'Nearby Market Research')}</h1><p>{t('比较同一入住日的周边酒店参考起价、中间 50% 价带与七日中位数浮动', 'Compare same-date nearby hotel quotes, interquartile band & 7-day median')}</p></div>
      <div className="gm-controls"><label>{t('入住日：', 'Check-in:')}<input type="date" min={props.earliest} value={range.start} onChange={event => props.updateStart(event.target.value)}/></label>{guidedDemo?<DemoCollectButton zh={zh} className="gm-primary"/>:<button type="button" className="gm-primary" onClick={() => setCollecting(true)}><Zap size={14}/>{t('桌面实时采集', 'Live Collection')}</button>}</div>
    </header>
    {loading ? <div className="gm-card gm-state" role="status"><h2>{t('正在读取所选日期的报价', 'Loading prices for these dates')}</h2><p>{t('读取已保存的采集快照。', 'Reading the saved collection snapshot.')}</p></div> : error ? <div className="gm-card gm-state" role="status"><h2>{t('暂时无法读取报价', 'Prices are temporarily unavailable')}</h2><p>{t('读取失败不代表周边没有住宿，稍后可以重试。', 'A failed read does not mean there are no nearby stays.')}</p><button type="button" onClick={props.retry}>{t('重新读取', 'Retry')}</button></div> : <>
      <div className="gm-overview-grid">
        <article className="gm-card gm-summary-card">
          <header className="gm-card-header"><div><h2>{t('当日样本统计与调价建议', 'Daily Sample Stats & Rate Advice')}</h2>{!locationMatched && rows.length > 0 && <span className="gm-snapshot-label">{locationStatus === 'changed' ? t('原地址快照', 'Previous address snapshot') : t('历史采集快照 · 地点待核实', 'Historical snapshot · Location unverified')}</span>}<p>{props.hotelCount} {locationMatched ? t('家周边住宿', 'nearby stays') : t('家采集住宿', 'collected stays')} · {sample?.stats.n ?? 0} {t('条有效参考报价', 'valid quotes')} · {t('采集于北京时间', 'Captured · China time')} {props.captured}</p></div><span className={`gm-pill ${props.sufficient ? 'gm-sufficient' : ''}`}>{props.sufficient ? t('样本充足 (≥3家)', 'Sufficient (≥3)') : t('样本不足', 'Limited sample')}</span></header>
          <div className="gm-segmented-cols">
            <div title={t('所选入住日有效参考报价的算术平均值', 'Arithmetic mean of valid reference quotes for the selected stay date')}><strong>{money(sample ? marketAverage(sample) : null)} <small>{t('/晚', '/ night')}</small></strong><span>{locationMatched ? t('周边平均参考价', 'Nearby Average Price') : t('采集报价均价', 'Collected Average Price')}</span></div>
            <div><strong>{props.sufficient ? `${money(sample?.stats.p25Cny)}–${money(sample?.stats.p75Cny)}` : '—'}</strong><span>{t('中间 50% 价带 (P25–P75)', 'Middle 50% Band')}</span></div>
            <div title={props.ownRateSource === 'orders' ? t(`${range.start} 的 ${props.orderRateCount ?? 0} 条有效导入订单；多晚订单按总金额除以晚数后取平均，不代表剩余客房挂牌价。`, `${props.orderRateCount ?? 0} valid imported bookings for ${range.start}; multi-night totals are divided by nights, then averaged. Not the listed price of available rooms.`) : t('当天无可用订单价时，使用有启用客房的各房型设置价均值', 'Without usable dated bookings, use the mean configured rate of room types with active rooms')}><strong>{money(ownRates?.average)} <small>{t('/晚', '/ night')}</small></strong><span>{props.ownRateSource === 'orders' ? t('本店当日订单均价', 'Your Dated Booking Average') : props.ownRateSource === 'settings_order_unavailable' ? t('本店设置均价 · 订单价读取失败', 'Configured Average · Booking Read Failed') : t('本店设置均价', 'Your Configured Average')}</span></div>
          </div>
          <section className="gm-advice" aria-label={t('调价建议', 'Rate advice')}>
            {locationStatus === 'matched' && advice ? <><h3>{inventoryStatus === 'loading' ? t('正在核对可售库存…', 'Checking availability…') : advice.title}</h3><p>{advice.basis}</p>{inventoryStatus !== 'loading' && <p className="gm-advice-note">{advice.action}</p>}</> : <><h3>{t('先补齐当前民宿的市场参照', 'Add local market quotes')}</h3><p>{locationStatus === 'changed' ? t('地址已变更，请重新采集当前地点报价。', 'Address changed; collect quotes for the current location.') : t('采集地点待核实，请重新采集周边报价。', 'Location unverified; collect nearby quotes again.')}</p></>}
          </section>
        </article>
        <MedianChart days={props.weeklyPrices} zh={zh}/>
      </div>
      <article className="gm-card gm-quotes-card">
        <header><h2>{locationMatched ? t('当日周边住宿报价列表（点击单店在行内原位展开详情）', 'Nearby Stay Quotes (Click any row to expand details inline)') : t('当日采集住宿报价列表（点击单店在行内原位展开详情）', 'Collected Stay Quotes (Click any row to expand details inline)')}</h2><p>{t('同名住宿自动合并；指定入住日的列表起价计入参考，房型、早餐和退改条件未核对', 'Merged by property name; dated list prices are references. Room, breakfast and cancellation terms are unverified.')}</p></header>
        {rows.length ? <div className="gm-clean-list" key={range.start}>{rows.map(({name, quote}, index) => {
          const detailId = `${prefix}-${index}`;
          const change = quote?.priceChange;
          return <details className={`gm-quote${quote&&countableQuote(quote)?' is-counted':''}`} key={name} open={index === 0}>
            <summary aria-controls={detailId}>
              <span className="gm-row-left"><span className="gm-rank">#{index + 1}</span><span className="gm-row-meta"><strong>{name}</strong><small>{[quote?.roomType, quote?.roomClass].filter(Boolean).join(' · ')}{(quote?.roomType||quote?.roomClass)&&' · '}<span className={quote&&countableQuote(quote)?'gm-counted-status':''}>{quote&&countableQuote(quote)?t('计入统计','Counted'):t('不计统计','Excluded')}</span></small></span></span>
              <span className="gm-quote-scale"><span style={{width: `${quote?.priceCny == null ? 0 : Math.round(quote.priceCny / maxPrice * 100)}%`}}/></span>
              <span className="gm-row-right"><strong>{money(quote?.priceCny)}<small>{quote?.priceType === 'display' ? t(' 起', ' and up') : t('/晚', '/ night')}</small></strong><span className={`gm-change ${change && change.amount > 0 ? 'is-up' : ''}`}>{change ? change.amount === 0 ? t('持平', 'Unchanged') : `${change.amount > 0 ? '+' : '−'}${money(Math.abs(change.amount))}` : t('暂无同条件对比', 'No prior match')}</span><span className="gm-detail-label"><span className="gm-closed">{t('查看详情', 'View details')}</span><span className="gm-open">{t('收起详情', 'Hide details')}</span></span></span>
            </summary>
            {quote ? props.detail(quote, detailId, () => {const details = document.getElementById(detailId)?.closest('details');if (details) details.open = false;}) : <p id={detailId} className="gm-missing">{t('该住宿在当前入住日尚未采集。', 'No quote was captured for this stay date.')}</p>}
          </details>;
        })}</div> : <div className="gm-state" role="status"><h3>{t('所选日期暂无采集报价', 'No collected quotes for this date')}</h3>{guidedDemo?<DemoCollectButton zh={zh}/>:<><p>{t('可以调整入住日期查看已有快照，或打开采集抽屉添加周边住宿。', 'Choose another date to view saved quotes or add nearby stays in the collector.')}</p><button type="button" onClick={() => setCollecting(true)}>{t('打开采集抽屉', 'Open Collector')}</button></>}</div>}
      </article>
    </>}
    {collecting && !guidedDemo && <WorkbenchDrawer title={t('采集携程搜索列表报价', 'Collect Ctrip Search Prices')} onClose={() => setCollecting(false)}><DesktopCollection zh={zh} demo={demo} expanded onSync={props.retry}/></WorkbenchDrawer>}
  </section>;
}
