import {mkdir,readFile,writeFile,rename,open,unlink} from "node:fs/promises";
import path from "node:path";
export const root=path.resolve(import.meta.dirname,"../.price-monitor");
export async function readJson(file,fallback){try{return JSON.parse(await readFile(path.join(root,file),"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}}
export async function atomicJson(file,value){await mkdir(root,{recursive:true});const temp=path.join(root,crypto.randomUUID()+".tmp");await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,path.join(root,file))}
export async function saveCapture(capture,observations){await mkdir(root,{recursive:true});const lock=await open(path.join(root,"history.lock"),"wx");try{await atomicJson(crypto.randomUUID()+".json",{capture,observations});const history=await readJson("history.json",[]);await atomicJson("history.json",[...history,...observations].slice(-3000));}finally{await lock.close();await unlink(path.join(root,"history.lock"));}}
