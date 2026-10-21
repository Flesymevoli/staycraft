export type RoomType = { id: string; name: string; beds: string; capacity: number; price: number; photo: string };
export type PropertyRoom = { id: string; number: string; floor: string; typeId: string; housekeeping: "clean" | "dirty"; active: boolean };
export type PropertyInventory = { types: RoomType[]; rooms: PropertyRoom[] };
export const emptyInventory: PropertyInventory = { types: [], rooms: [] };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const text = (v: unknown, max: number) => typeof v === "string" && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v);
export function validateInventory(value: unknown, propertyId?: string): PropertyInventory | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data=value as PropertyInventory;
  if(Object.keys(data).sort().join()!=="rooms,types" || !Array.isArray(data.types) || !Array.isArray(data.rooms) || data.types.length>20 || data.rooms.length>200) return null;
  const types=new Set<string>(), rooms=new Set<string>(), numbers=new Set<string>();
  for(const t of data.types){
    if(!t || Object.keys(t).sort().join()!=="beds,capacity,id,name,photo,price" || !uuid.test(t.id) || types.has(t.id) || !text(t.name,60) || !text(t.beds,80) || !Number.isInteger(t.capacity) || t.capacity<1 || t.capacity>12 || !Number.isFinite(t.price) || t.price<=0 || t.price>99999 || Math.abs(Math.round(t.price*100)-t.price*100)>0.000001 || typeof t.photo!=="string") return null;
    if(t.photo && (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/i.test(t.photo) || (propertyId && !t.photo.startsWith(propertyId+"/")))) return null;
    types.add(t.id);
  }
  for(const r of data.rooms){
    if(!r || Object.keys(r).sort().join()!=="active,floor,housekeeping,id,number,typeId" || !uuid.test(r.id) || rooms.has(r.id) || !text(r.number,24) || !text(r.floor,30) || !types.has(r.typeId) || !["clean","dirty"].includes(r.housekeeping) || typeof r.active!=="boolean") return null;
    const number=r.number.trim().normalize("NFKC").toLowerCase(); if(numbers.has(number))return null;
    rooms.add(r.id);numbers.add(number);
  }
  return {types:data.types.map(t=>({...t,name:t.name.trim(),beds:t.beds.trim()})),rooms:data.rooms.map(r=>({...r,number:r.number.trim().normalize("NFKC"),floor:r.floor.trim()}))};
}
