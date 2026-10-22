"use client";
import {useCallback,useEffect,useSyncExternalStore} from "react";
import {emptyInventory,validateInventory,type PropertyInventory} from "@/lib/property-inventory";
export type RoomPreviewData={inventory:PropertyInventory;photos:Record<string,string>};
type Snapshot={data:RoomPreviewData;ready:boolean;unavailable:boolean;revision:string|null;writing:boolean;legacy:RoomPreviewData|null};
const initial:Snapshot={data:{inventory:emptyInventory,photos:{}},ready:false,unavailable:false,revision:null,writing:false,legacy:null};
const stores=new Map<string,{value:Snapshot;listeners:Set<()=>void>;loading:boolean}>();
function entry(scope:string){if(!stores.has(scope))stores.set(scope,{value:initial,listeners:new Set(),loading:false});return stores.get(scope)!;}
function publish(scope:string,value:Snapshot){const store=entry(scope);store.value=value;store.listeners.forEach(fn=>fn());}
function legacyData(scope:string){try{const parsed=JSON.parse(sessionStorage.getItem(`staycraft-room-preview-v1:${scope}`)||"null");return parsed&&validateInventory(parsed.inventory)&&parsed.inventory.rooms.length?parsed as RoomPreviewData:null;}catch{return null;}}
function documentData(inventory:PropertyInventory):RoomPreviewData{return {inventory,photos:Object.fromEntries(inventory.types.filter(t=>t.photo).map(t=>[t.id,`/api/workspace/room-photo?path=${encodeURIComponent(t.photo)}`]))};}
async function load(scope:string){const store=entry(scope);if(store.loading||store.value.writing)return;store.loading=true;try{const response=await fetch("/api/workspace/inventory",{cache:"no-store"});const result=await response.json();const inventory=validateInventory(result.inventory);if(!response.ok||!inventory)throw new Error();if(store.value.writing)return;publish(scope,{data:documentData(inventory),ready:true,unavailable:false,revision:result.revision,writing:false,legacy:inventory.rooms.length?null:legacyData(scope)});}catch{publish(scope,{...store.value,ready:true,unavailable:true});}finally{store.loading=false;}}
export function useRoomPreview(scope:string){
 const subscribe=useCallback((fn:()=>void)=>{entry(scope).listeners.add(fn);return()=>{entry(scope).listeners.delete(fn);};},[scope]);
 const read=useCallback(()=>entry(scope).value,[scope]);const snapshot=useSyncExternalStore(subscribe,read,()=>initial);
 useEffect(()=>{void load(scope);const refresh=()=>void load(scope);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[scope]);
 const save=useCallback(async(data:RoomPreviewData)=>{const previous=entry(scope).value;if(!previous.ready||previous.unavailable||previous.writing)return false;const inventory=validateInventory(data.inventory);if(!inventory)return false;publish(scope,{...previous,writing:true});try{
  for(const type of inventory.types){const image=data.photos[type.id];if(image?.startsWith("data:image/webp;base64,")){const bytes=Uint8Array.from(atob(image.split(",")[1]),c=>c.charCodeAt(0));const response=await fetch("/api/workspace/room-photo",{method:"POST",headers:{"Content-Type":"image/webp"},body:bytes});const result=await response.json();if(!response.ok)throw new Error();type.photo=result.path;}}
  const response=await fetch("/api/workspace/inventory",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({inventory,revision:previous.revision})});const result=await response.json();const saved=validateInventory(result.inventory);if(!response.ok||!saved)throw new Error();publish(scope,{data:documentData(saved),ready:true,unavailable:false,revision:result.revision,writing:false,legacy:null});return true;
 }catch{publish(scope,{...previous,writing:false});return false;}},[scope]);
 return {...snapshot,save,reload:()=>load(scope)};
}
