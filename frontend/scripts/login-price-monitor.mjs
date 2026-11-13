// User completes sign-in in this dedicated window; credentials are never exported.
import {launchPriceBrowser} from './price-monitor-browser.mjs';
import {mkdir,open,unlink,readFile} from "node:fs/promises";
import path from "node:path";
import {root,atomicJson} from "./price-monitor-store.mjs";
if(process.argv[2]!=="--open-login"||process.env.VERCEL||process.env.STAYCRAFT_HOSTED)throw Error("local_only");
await mkdir(root,{recursive:true});let lock;try{lock=await open(path.join(root,"collector.lock"),"wx")}catch{process.exit(2)}
let context,cancelled=false;
const cancellation=setInterval(async()=>{try{await readFile(path.join(root,'cancel.request'));cancelled=true;await context?.close().catch(()=>{});}catch{}},500);
const deadline=setTimeout(()=>{cancelled=true;void context?.close().catch(()=>{});},10*60000);
try{
 await atomicJson("login-state.json",{state:"opening",updatedAt:new Date().toISOString()});
 context=await launchPriceBrowser(process.env.STAYCRAFT_PRICE_PROFILE||path.join(root,"browser-profile"),{viewport:{width:1280,height:900}});
 if(cancelled)throw Error("login_cancelled");
 const closed=new Promise(resolve=>context.once("close",resolve));
 const page=context.pages()[0]||await context.newPage();
 const response=await page.goto("https://passport.ctrip.com/user/login",{waitUntil:"domcontentloaded",timeout:45000});
 if(!response?.ok())throw Error("login_page_unavailable");
 await page.bringToFront();
 await atomicJson("session.json",{scope:"member:"+crypto.randomUUID(),openedAt:new Date().toISOString()});
 await atomicJson("login-state.json",{state:"open",updatedAt:new Date().toISOString()});
 await closed;
 await atomicJson("login-state.json",{state:"closed",updatedAt:new Date().toISOString()});
}catch{
 await atomicJson("login-state.json",{state:"failed",error:context?"login_failed":"browser_unavailable",updatedAt:new Date().toISOString()});
 process.exitCode=1;
}finally{clearInterval(cancellation);clearTimeout(deadline);await context?.close().catch(()=>{});await lock.close();await unlink(path.join(root,"collector.lock"));}
