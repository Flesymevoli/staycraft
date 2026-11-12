// Collect upcoming local events from the official Suzhou tourism calendar (public, no login).
// Source: visitsz.wglj.suzhou.com.cn — 苏州市文化广电和旅游局 / 苏州市旅游咨询中心.
// Output: tmp/events-raw.json with title, window, venue, source url and verification level.
import fs from 'node:fs';
import path from 'node:path';
import {classifyLocalEvent} from './classify-local-event.mjs';

const BASE = 'https://visitsz.wglj.suzhou.com.cn/festival-activity.aspx';
const pages = Number(process.argv[2] || 8);
const horizonDays = Number(process.argv[3] || 21);
const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Asia/Shanghai'}).format(new Date());
const horizon = new Date(Date.parse(today + 'T00:00:00Z') + horizonDays * 86400000).toISOString().slice(0, 10);
const CITY = /太仓|沙溪|浏河|娄东|城厢/;
if (!Number.isInteger(pages) || pages < 1 || pages > 20 || !Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
  throw new Error('Usage: node collect-suzhou-festivals.mjs [pages:1–20] [horizonDays:1–90]');
}

const strip = html => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const read = url => fetch(url, {signal:AbortSignal.timeout(8000)});
const events = [];

for (let page = 1; page <= pages; page += 1) {
  const response = await read(`${BASE}?page=${page}`);
  if (!response.ok) { console.error(`page ${page}: HTTP ${response.status}`); break; }
  const html = await response.text();
  // Each list row: <a href="festival-detail.aspx?id=...">title</a> ... 活动时间：start - end
  const rowPattern = /<a href="festival-detail\.aspx\?id=(\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,400}?活动时间：\s*(\d{4}-\d{2}-\d{2})(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/g;
  let match;
  while ((match = rowPattern.exec(html))) {
    const [, id, rawTitle, start, end] = match;
    const title = strip(rawTitle);
    const windowEnd = end || start;
    if (!title || !validDay(start) || !validDay(windowEnd) || windowEnd < start) continue;
    events.push({id, title, start, end: windowEnd, category:classifyLocalEvent(title), sourceUrl: `https://visitsz.wglj.suzhou.com.cn/festival-detail.aspx?id=${id}`});
  }
}

// Keep only events that are still upcoming or in progress, and that matter for this property.
const scoped = [...new Map(events.map(event => [event.id,event])).values()];
const future = scoped.filter(event => event.end >= today && event.start <= horizon).sort((left, right) => left.start.localeCompare(right.start));

// Check date-matched candidates, prioritizing Taicang keywords before reading venue details.
const interesting = [...future].sort((left,right) => Number(CITY.test(right.title)) - Number(CITY.test(left.title))).slice(0,25);
for (const event of interesting) {
  try {
    const response = await read(event.sourceUrl);
    if (!response.ok) continue;
    const html = await response.text();
    const venue = html.match(/地点：\s*<[^>]*>([^<]+)/) || html.match(/地点：\s*([^<\n]+)/);
    const source = html.match(/来源：\s*([^<\n]+)/);
    event.venue = venue ? strip(venue[1]) : null;
    event.publisher = source ? strip(source[1]) : null;
    if(new URL(response.url).hostname==='visitsz.wglj.suzhou.com.cn'&&event.venue){
      event.verification='official';
      event.observedAt=new Date().toISOString();
    }
    event.taicang = CITY.test(`${event.title} ${event.venue || ''}`);
  } catch (error) {
    event.error = error instanceof Error ? error.message.slice(0, 80) : String(error);
  }
}

const output = {collectedAt: new Date().toISOString(), source: '苏州市文广旅局 节庆日历', pages, today, horizon, totalListed: events.length, upcoming: future.length, interesting};
const target = path.resolve(import.meta.dirname, '..', '..', 'tmp', 'events-raw.json');
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output, null, 2));
console.log(JSON.stringify({totalListed: output.totalListed, upcoming: output.upcoming, interesting: interesting.map(event => ({title: event.title, start: event.start, end: event.end, venue: event.venue, category:event.category, verification: event.verification??'pending'}))}, null, 2));
