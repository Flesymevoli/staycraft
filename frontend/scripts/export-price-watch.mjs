// Local read-only export. Does not collect, open a browser or copy credentials.
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,readJson} from './price-monitor-store.mjs';
import {buildPriceWatch} from '../src/lib/competitor-observations.ts';
import {priceWatchCsv} from '../src/lib/price-watch-export.ts';
if(process.argv[2]!=='--export-price-watch'||process.env.VERCEL||process.env.CF_PAGES||process.env.STAYCRAFT_HOSTED)throw Error('local_explicit_run_only');
const history=await readJson('history.json',[]),job=await readJson('job.json',{status:'idle'}),session=await readJson('session.json',null);
const watch=buildPriceWatch(history,job,session?.scope||'anonymous');
await writeFile(path.join(root,'price-watch.csv'),priceWatchCsv(watch),'utf8');
console.log(`Exported ${watch.rows.length} rows to .price-monitor/price-watch.csv; saved observations only.`);
