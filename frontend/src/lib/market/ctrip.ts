// Bridges the existing local Ctrip calendar collector into the market Quote model.
// Those observations are date reference prices: no room type, meal or refund terms, so they
// are tagged as `calendar` and can never be mixed into a strict comparable band.
import type {Quote} from './types';
import type {Observation} from '../competitor-observations';
import {marketDay} from './quote-identity';

const STATUS: Record<Observation['status'], Quote['status']> = {
  observed: 'available',
  missing: 'missing',
  conflicting: 'unknown',
  not_accepting: 'no_saleable',
  login_required: 'source_error',
};

export function observationToQuote(observation: Observation): Quote {
  return {
    id: `ctrip:${observation.hotelId}:${observation.stayDate}:${observation.capturedAt}`,
    hotelId: observation.hotelId,
    source: 'platform',
    sourceName: observation.hotelName,
    sourceUrl: observation.sourceUrl,
    capturedAt: observation.capturedAt,
    stayDate: observation.stayDate,
    nights: observation.nights,
    adults: observation.adults,
    // Calendar references never identify a sellable room plan; keep the fields empty instead of guessing.
    roomType: undefined,
    roomClass: undefined,
    priceCny: observation.status === 'observed' ? observation.amount : null,
    priceType: 'calendar',
    status: STATUS[observation.status] ?? 'unknown',
    note: observation.status === 'login_required' ? '携程需要登录才能取价' : '携程日历参考价，房型/早餐/退改未知',
  };
}

export function observationsToQuotes(observations: Observation[]): Quote[] {
  return observations.filter(validObservation).map(observationToQuote);
}

export function validObservation(value: unknown): value is Observation {
  const item = value as Observation;
  return !!item && typeof item === 'object' && /^\d{1,12}$/.test(item.hotelId)
    && typeof item.hotelName === 'string' && !!item.hotelName.trim()
    && marketDay(item.stayDate) && typeof item.capturedAt === 'string' && Number.isFinite(Date.parse(item.capturedAt))
    && item.currency === 'CNY' && item.kind === 'calendar_reference'
    && item.rooms === 1 && item.adults === 2 && item.children === 0 && item.nights === 1
    && Object.hasOwn(STATUS, item.status)
    && (item.status !== 'observed' ? item.amount === null : typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount > 0 && item.amount <= 1000000)
    && item.sourceUrl === `https://hotels.ctrip.com/hotels/${item.hotelId}.html`;
}
