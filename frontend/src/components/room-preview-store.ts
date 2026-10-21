"use client";
import {useCallback,useSyncExternalStore} from "react";
import {emptyInventory,validateInventory,type PropertyInventory} from "@/lib/property-inventory";
export type RoomPreviewData={inventory:PropertyInventory;photos:Record<string,string>};
const event="staycraft-room-preview-change";
const empty='{"inventory":{"types":[],"rooms":[]},"photos":{}}';
const fallback:RoomPreviewData={inventory:emptyInventory,photos:{}};
function parse(raw:string):RoomPreviewData{
  if(raw==="unavailable")return fallback;
  try{const value=JSON.parse(raw);const inventory=validateInventory(value.inventory);if(!inventory || !value.photos || typeof value.photos!=="object" || Array.isArray(value.photos))return fallback;
    const photos:Record<string,string>={};for(const type of inventory.types){const photo=value.photos[type.id];if(typeof photo==="string" && photo.length<=400000 && /^data:image\/webp;base64,[a-zA-Z0-9+/=]+$/.test(photo))photos[type.id]=photo;}
    return {inventory,photos};
  }catch{return fallback;}
}
export function useRoomPreview(scope:string){
  const key=`staycraft-room-preview-v1:${scope}`;
  const subscribe=useCallback((notify:()=>void)=>{window.addEventListener(event,notify);window.addEventListener("storage",notify);return()=>{window.removeEventListener(event,notify);window.removeEventListener("storage",notify);};},[]);
  const read=useCallback(()=>{try{return sessionStorage.getItem(key) ?? empty;}catch{return "unavailable";}},[key]);
  const raw=useSyncExternalStore(subscribe,read,()=>null);
  const save=useCallback((data:RoomPreviewData)=>{
    const inventory=validateInventory(data.inventory);if(!inventory)return false;
    try{sessionStorage.setItem(key,JSON.stringify({...data,inventory}));window.dispatchEvent(new Event(event));return true;}catch{return false;}
  },[key]);
  return {data:raw===null?fallback:parse(raw),ready:raw!==null,unavailable:raw==="unavailable",save};
}
