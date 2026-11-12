// User completes sign-in in this dedicated window; credentials are never exported.
import {chromium} from "playwright";
import {mkdir,open,unlink} from "node:fs/promises";
import path from "node:path";
import {root,atomicJson} from "./price-monitor-store.mjs";
if(process.argv[2]!=="--open-login"||process.env.VERCEL||process.env.STAYCRAFT_HOSTED)throw Error("local_only");
await mkdir(root,{recursive:true});let lock;try{lock=await open(path.join(root,"collector.lock"),"wx")}catch{process.exit(2)}
let context;
try{
 await atomicJson("login-state.json",{state:"opening",updatedAt:new Date().toISOString()});
 context=await chromium.launchPersistentContext(process.env.STAYCRAFT_PRICE_PROFILE||path.join(root,"browser-profile"),{headless:false,locale:"zh-CN",viewport:{width:1280,height:900}});
 await atomicJson("session.json",{scope:"member:"+crypto.randomUUID(),openedAt:new Date().toISOString()});
 const page=context.pages()[0]||await context.newPage();await page.goto("https://www.ctrip.com/",{waitUntil:"domcontentloaded",timeout:45000});
 await atomicJson("login-state.json",{state:"open",updatedAt:new Date().toISOString()});
 await new Promise(resolve=>context.once("close",resolve));
 await atomicJson("login-state.json",{state:"closed",updatedAt:new Date().toISOString()});
}catch{
 await atomicJson("login-state.json",{state:"failed",updatedAt:new Date().toISOString()});
 process.exitCode=1;
}finally{await context?.close().catch(()=>{});await lock.close();await unlink(path.join(root,"collector.lock"));}
