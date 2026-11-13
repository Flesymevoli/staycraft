const {createHash,randomUUID}=require('node:crypto');
const {mkdir,readFile,writeFile,rename}=require('node:fs/promises');
const path=require('node:path');

const normalizedLocation=value=>typeof value==='string'?value.normalize('NFKC').replace(/\s+/g,'').trim():'';
function collectionContext(identity){
 const location=normalizedLocation(identity.location);
 if(!location)throw Error('property_location_required');
 return createHash('sha256').update(JSON.stringify([identity.userId,identity.propertyId,location])).digest('hex');
}
function parseHotels(input){
 if(typeof input!=='string'||input.length>4000)throw Error('invalid_hotels');
 const hotels=input.trim().split(/\r?\n/).map(line=>{
  const match=line.trim().match(/^https:\/\/hotels\.ctrip\.com\/hotels\/(\d{1,12})\.html(?:[?#]\S*)?\s+(.{1,160})$/);
  if(!match||!match[2].trim()||/[\u0000-\u001f\u007f]/.test(match[2]))throw Error('invalid_hotels');
  return {id:match[1],name:match[2].trim()};
 });
 if(hotels.length>5||new Set(hotels.map(hotel=>hotel.id)).size!==hotels.length)throw Error('invalid_hotels');
 return hotels;
}
function normalizedHotels(input){return input===''?'':parseHotels(input).map(hotel=>`https://hotels.ctrip.com/hotels/${hotel.id}.html ${hotel.name}`).join('\n')}
function checkContext(identity,key){
 if(typeof key!=='string'||key!==collectionContext(identity))throw Error('collection_context_changed');
}
function collectionFile(base,identity){return path.join(base,'locations',collectionContext(identity),'latest.json')}
async function readTargets(base,identity){
 const contextKey=collectionContext(identity);
 let stored;
 try{stored=JSON.parse(await readFile(path.join(base,'targets',contextKey+'.json'),'utf8'))}
 catch(error){if(error.code!=='ENOENT')throw error}
 const hotels=stored?.contextKey===contextKey?normalizedHotels(stored.hotels):'';
 return {state:'idle',contextKey,location:identity.location,hotels,savedAt:stored?.savedAt||null};
}
async function saveTargets(base,identity,input){
 checkContext(identity,input?.contextKey);
 const hotels=normalizedHotels(input?.hotels);
 const value={state:'idle',contextKey:collectionContext(identity),location:identity.location,hotels,savedAt:new Date().toISOString()};
 const directory=path.join(base,'targets');
 await mkdir(directory,{recursive:true});
 const file=path.join(directory,value.contextKey+'.json');
 const temporary=file+'.'+randomUUID()+'.tmp';
 await writeFile(temporary,JSON.stringify(value));
 await rename(temporary,file);
 return value;
}
module.exports={normalizedLocation,collectionContext,collectionFile,checkContext,parseHotels,readTargets,saveTargets};
