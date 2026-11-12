import assert from 'node:assert/strict';
import {monitorDates} from './price-monitor-dates.mjs';
assert.deepEqual(monitorDates(null,'2026-10-31'),Array.from({length:7},(_,i)=>'2026-11-0'+(i+1)));
assert.deepEqual(monitorDates(['2026-11-04','2026-11-07'],'2026-11-01'),Array.from({length:7},(_,i)=>'2026-11-0'+(i+2)));
assert.deepEqual(monitorDates(null,'2026-12-29'),['2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05']);
assert.deepEqual(monitorDates([], '2028-02-25'),['2028-02-26','2028-02-27','2028-02-28','2028-02-29','2028-03-01','2028-03-02','2028-03-03']);
assert.throws(()=>monitorDates([], '2026-02-30'),/invalid_monitor_day/);
console.log('PASS consecutive seven dates, stale selection ignored, year and leap-day boundaries');
