import type {MarketSample} from './types';

export type DailyInventory = {date: string; capacity: number; booked: number; available: number};
export type RateAdvice = {title: string; basis: string; action: string};

export function marketInventoryAdvice({sample, ownRates, inventory, zh}: {
  sample: MarketSample;
  ownRates?: {min: number; max: number} | null;
  inventory?: DailyInventory | null;
  zh: boolean;
}): RateAdvice {
  const t = (cn: string, en: string) => zh ? cn : en;
  const date = sample.window.start;
  const money = (value: number) => `¥${Math.round(value).toLocaleString('en-US')}`;
  const {medianCny, p25Cny, p75Cny} = sample.stats;
  if (sample.window.end !== date || sample.comparability === 'none' || medianCny === null || p25Cny === null || p75Cny === null) {
    return {title: t('样本不足，先补齐同日参照', 'Add comparable quotes for this date'), basis: t(`${date} 需要至少 3 家独立住宿的有效报价。`, `${date} needs valid quotes from at least three distinct stays.`), action: t('补齐日历参考价后，再结合当天余房判断。', 'Collect calendar prices, then review them alongside availability.')};
  }
  const marketBasis = t(`${date} 周边样本中位数 ${money(medianCny)}，中间 50% 价带 ${money(p25Cny)}–${money(p75Cny)}。`, `${date} sample median ${money(medianCny)}, middle 50% band ${money(p25Cny)}–${money(p75Cny)}.`);
  const validInventory = inventory?.date === date && [inventory.capacity, inventory.booked, inventory.available].every(value => Number.isInteger(value) && value >= 0) && inventory.capacity > 0 && inventory.booked + inventory.available === inventory.capacity;
  if (!validInventory || !inventory) return {title: t('先核对当天可售房量', 'Check availability for this date'), basis: marketBasis, action: t('当天库存尚不完整，补齐房量与订单后再决定提价或促销。', 'Availability is incomplete. Add room inventory and bookings before choosing a rate change or promotion.')};
  const basis = marketBasis + t(` 本店已订 ${inventory.booked}/${inventory.capacity} 间，剩余 ${inventory.available} 间可售。`, ` Your property has ${inventory.booked}/${inventory.capacity} rooms booked and ${inventory.available} available.`);
  if (inventory.available === 0) return {title: t('当天已满房，优先关注相邻日期', 'Sold out for this date; review adjacent dates'), basis, action: t('当天没有余房可通过降价补量，可切换日期查看下一晚的库存与报价。', 'There are no open rooms to fill with a discount. Select the next date to review its availability and prices.')};
  if (!ownRates || !Number.isFinite(ownRates.min) || !Number.isFinite(ownRates.max) || ownRates.min <= 0 || ownRates.max < ownRates.min) return {title: t('补齐本店挂牌价后再比较', 'Add your listed rates to compare'), basis, action: t('在「我的民宿」维护在售房型价格，再判断与市场价带的关系。', 'Set prices for active room types in My property to compare them with the market band.')};
  const caution = t('先核对房型、早餐和退改条件，再对可售房型作单独调整。', 'Verify room type, breakfast and cancellation terms before changing an available room type.');
  if (ownRates.max < p25Cny && inventory.booked / inventory.capacity >= 0.8) return {title: t('余房较少且挂牌价偏低，可评估小幅试涨', 'Few rooms remain and listed rates are low; review a small increase'), basis, action: t(`本店最高挂牌价 ${money(ownRates.max)} 低于样本下四分位。`, `Your highest listed rate ${money(ownRates.max)} is below the lower quartile. `) + caution};
  if (ownRates.min > p75Cny) return {title: t('仍有余房且挂牌价偏高，先核对价格差异', 'Rooms remain and listed rates are high; review the gap'), basis, action: t(`本店最低挂牌价 ${money(ownRates.min)} 高于样本上四分位。`, `Your lowest listed rate ${money(ownRates.min)} exceeds the upper quartile. `) + caution};
  return {title: t('结合余房安排曝光与价格复核', 'Plan exposure and rate reviews around open rooms'), basis, action: t('按当天总库存安排定向推广，并核对具体可售房型的挂牌价；现有报价未对应到本店房型，暂不指定房型或调价金额。', 'Use total availability to plan targeted promotion and review available room rates. Quotes are not mapped to your room types, so no room-specific price or amount is proposed.')};
}
