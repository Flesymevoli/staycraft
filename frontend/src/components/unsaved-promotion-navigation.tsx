"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {WorkbenchDrawer} from './workbench-drawer';

export function UnsavedPromotionNavigation({dirty,zh}:{dirty:boolean;zh:boolean}){
 const router=useRouter(),[destination,setDestination]=useState<string|null>(null);
 useEffect(()=>{
  if(!dirty)return;
  const unload=(event:BeforeUnloadEvent)=>event.preventDefault();
  const navigate=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const anchor=(event.target as Element)?.closest?.('a[href]');
   if(!(anchor instanceof HTMLAnchorElement)||anchor.target&&anchor.target!=='_self'||anchor.hasAttribute('download'))return;
   const url=new URL(anchor.href);
   if(url.origin!==location.origin||url.pathname===location.pathname&&url.search===location.search)return;
   // Stop the original Link event. The explicit confirm action owns navigation.
   event.preventDefault();event.stopPropagation();
   setDestination(url.pathname+url.search+url.hash);
  };
  window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true)};
 },[dirty]);
 if(!destination)return null;
 return <WorkbenchDrawer title={zh?'文案尚未保存，确认离开？':'Unsaved copy — leave this page?'} onClose={()=>setDestination(null)}>
  <p>{zh?'文案尚未保存到账号。在本窗口内切换页面会保留当前草稿，返回推广方案可继续编辑；关闭或刷新整个窗口可能丢失未保存内容。':'This copy is not saved to your account. Moving between pages in this window keeps the draft for your return. Closing or reloading the window may lose unsaved text.'}</p>
  <div className="promotion-actions">
   <button type="button" className="inventory-text" onClick={()=>setDestination(null)}>{zh?'继续编辑':'Keep editing'}</button>
   <button type="button" className="native-primary" onClick={()=>{const target=destination;setDestination(null);router.push(target)}}>{zh?'确认离开':'Leave page'}</button>
  </div>
 </WorkbenchDrawer>;
}
