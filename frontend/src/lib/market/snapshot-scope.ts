// Records the property's address at collection time, not the hotels' distance from it.
export function normalizeMarketLocation(value:string):string {
 return value.normalize('NFKC').replace(/\s+/g,'').trim();
}

export function marketScopeNote(location:string):string {
 return JSON.stringify({version:1,kind:'property_market_scope',location:normalizeMarketLocation(location)});
}

export function marketScopeLocation(note:unknown):string|null {
 if(typeof note!=='string')return null;
 try {
  const value=JSON.parse(note);
  return value?.version===1&&value.kind==='property_market_scope'&&typeof value.location==='string'
   ?normalizeMarketLocation(value.location)||null:null;
 }catch{return null;}
}
