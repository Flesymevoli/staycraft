// Local evidence ingestion. Input must come from an observed public browser DOM.
import {saveCapture} from "./price-monitor-store.mjs";
import {parseCalendar} from "../src/lib/competitor-observations.ts";
if(process.env.VERCEL||process.env.CF_PAGES||process.env.STAYCRAFT_HOSTED) throw Error("local_only");
let raw="";for await(const chunk of process.stdin){raw+=chunk;if(raw.length>1100000)throw Error("capture_too_large");}
const capture=JSON.parse(raw), observations=parseCalendar(capture);
await saveCapture(capture,observations);
console.log(JSON.stringify({saved:observations.length,successful:observations.filter(v=>v.status==="observed").length}));
