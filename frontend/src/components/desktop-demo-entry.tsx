'use client';
import {useState} from 'react';
import {ArrowUpRight,Play} from 'lucide-react';
import {useDesktopBridgeAvailable} from './desktop-surface';
export function DesktopDemoEntry({zh}:{zh:boolean}){
 const desktop=useDesktopBridgeAvailable(),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 if(!desktop)return null;
 return <aside className="auth-demo-entry" aria-label={zh?'体验演示':'Try the demo'}><span className="auth-demo-icon"><Play size={22}/></span><div><h2>{zh?'先体验，再开始。':'Take a look inside.'}</h2><p>{zh?'从空工作台开始，体验导入、采集与经营建议。无需注册，修改仅留在本机。':'Start with an empty dashboard and explore imports, prices and insights. No signup; changes stay on this device.'}</p></div><button type="button" disabled={busy} onClick={async()=>{setBusy(true);setFailed(false);try{const result=await window.staycraftDesktop?.openDemo?.();if(!result?.ok)setFailed(true)}catch{setFailed(true)}finally{setBusy(false)}}}>{busy?(zh?'正在打开…':'Opening…'):(zh?'体验演示':'Explore demo')}<ArrowUpRight size={18}/></button>{failed&&<p className="auth-demo-error" role="alert">{zh?'演示未能启动，请重试。':'Could not open the demo. Please retry.'}</p>}</aside>;
}
