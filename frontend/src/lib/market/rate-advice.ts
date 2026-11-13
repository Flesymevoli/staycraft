import type {MarketSample} from './types';
import {marketAverage} from './sample';

export type DailyInventory = {date: string; capacity: number; booked: number; available: number};
export type RateAdvice = {title: string; basis: string; action: string};

export function marketInventoryAdvice({sample, ownRates, inventory, zh}: {
  sample: MarketSample;
  ownRates?: {min: number; max: number; average?: number} | null;
  inventory?: DailyInventory | null;
  zh: boolean;
}): RateAdvice {
  const t = (cn: string, en: string) => zh ? cn : en;
  const date = sample.window.start;
  const money = (value: number) => `¥${Math.round(value).toLocaleString('en-US')}`;
  const average = marketAverage(sample);
  if (sample.window.end !== date || sample.comparability === 'none' || average === null) {
    return {title: t('样本不足，先补齐报价', 'Add more quotes first'), basis: t(`${date} 需要至少 3 家住宿的有效报价。`, `${date} needs valid quotes from at least three stays.`), action: t('补齐同日参考价后，再比较均价。', 'Collect same-date prices to compare averages.')};
  }
  const marketBasis = t(`${date} · 周边均价 ${money(average)}/晚`, `${date} · Nearby average ${money(average)}/night`);
  const validInventory = inventory?.date === date && [inventory.capacity, inventory.booked, inventory.available].every(value => Number.isInteger(value) && value >= 0) && inventory.capacity > 0 && inventory.booked + inventory.available === inventory.capacity;
  if (!validInventory || !inventory) return {title: t('先核对当天可售房量', 'Check this date’s availability'), basis: marketBasis, action: t('补齐房量与订单后，再给出调价建议。', 'Add inventory and bookings before assessing rates.')};
  if (inventory.available === 0) return {title: t('当天已满房，关注相邻日期', 'Sold out; check nearby dates'), basis: marketBasis, action: t('无需降价补量，可查看下一晚的余房。', 'No rooms to fill; review the next night’s availability.')};
  // A range midpoint is not an average. Older responses must refresh actual room-type rates.
  const ownAverage = ownRates?.average;
  if (ownAverage == null || !Number.isFinite(ownAverage) || ownAverage <= 0) return {title: t('补齐本店挂牌价', 'Add your listed rates'), basis: marketBasis, action: t(`剩余 ${inventory.available} 间 · 在「我的民宿」补齐房型价格后刷新。`, `${inventory.available} rooms left · Add room-type rates in My property, then refresh.`)};
  // Compare at the same whole-yuan precision shown in the card.
  const difference = Math.round(ownAverage) - Math.round(average);
  return {
    title: difference > 0 ? t('均价偏高，建议小幅降价', 'Above average: lower rates slightly') : difference < 0 ? t('均价偏低，建议小幅涨价', 'Below average: raise rates slightly') : t('均价持平，建议维持现价', 'Averages match: hold current rates'),
    basis: t(`本店均价 ${money(ownAverage)} · 周边均价 ${money(average)}/晚`, `Your average ${money(ownAverage)} · Nearby average ${money(average)}/night`),
    action: t(`剩余 ${inventory.available} 间 · 参考起价，调价前核对房型与退改条件。`, `${inventory.available} rooms left · Reference prices; check room types and cancellation terms before adjusting.`),
  };
}
