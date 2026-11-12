// Bridges the local Ctrip collector history into market quotes at request time.
// Only the newest capture batch is used; older batches stay in the collector history.
import fs from 'node:fs';
import path from 'node:path';
import {observationToQuote, validObservation} from './ctrip';
import {compareObservations} from '../competitor-observations';
import type {Observation} from '../competitor-observations';
import type {Quote} from './types';

export type CollectedSnapshot = {quotes:Quote[];capturedAt:string|null;hotels:number;nights:number;status:'collected'|'unavailable'};
type CollectionJob = {startedAt?:string;finishedAt?:string|null};
const unavailable = (): CollectedSnapshot => ({quotes:[],capturedAt:null,hotels:0,nights:0,status:'unavailable'});

export function collectedSnapshot(input: unknown, job?: CollectionJob): CollectedSnapshot {
  const history = (Array.isArray(input) ? input : []).filter(validObservation).sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
  const latest = history[0];
  if (!latest) return unavailable();
  const latestTime = Date.parse(latest.capturedAt);
  const start = Date.parse(job?.startedAt || '');
  const finish = Date.parse(job?.finishedAt || '') || Infinity;
  // Older captures have no run ID: keep the legacy time window only when no matching job exists.
  const since = Number.isFinite(start) && latestTime >= start && latestTime <= finish ? start : latestTime - 10 * 60 * 1000;
  const unique = new Map<string, Observation>();
  for (const item of history.filter(item => Date.parse(item.capturedAt) >= since)) {
    const key = `${item.hotelId}:${item.stayDate}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  const quotes = [...unique.values()].map(item => {
    const quote = observationToQuote(item);
    // Unknown identity scopes are not comparable. No account/session value is sent to the browser.
    const previous = item.authScope ? history.find(other => other.hotelId === item.hotelId && other.stayDate === item.stayDate
      && other.authScope === item.authScope && Date.parse(other.capturedAt) < Date.parse(item.capturedAt)) : undefined;
    const change = compareObservations(item, previous);
    if (previous && previous.amount !== null && change !== null) quote.priceChange = {amount:change,previousPrice:previous.amount,previousCapturedAt:previous.capturedAt};
    return quote;
  });
  return {quotes,capturedAt:latest.capturedAt,hotels:new Set(quotes.map(quote => quote.hotelId)).size,nights:new Set(quotes.map(quote => quote.stayDate)).size,status:'collected'};
}

export function readCollectedSnapshot(cwd = process.cwd()): CollectedSnapshot | null {
  try {
    const file = path.join(cwd, '.price-monitor', 'history.json');
    if (!fs.existsSync(file)) return null;
    const history: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    let job: CollectionJob | undefined;
    try { job = JSON.parse(fs.readFileSync(path.join(cwd, '.price-monitor', 'job.json'), 'utf8')); } catch { /* Legacy snapshots may not include job metadata. */ }
    return collectedSnapshot(history, job);
  } catch {
    return unavailable();
  }
}
