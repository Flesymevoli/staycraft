export const bookingCsvHeader='channel,external_id,room_type,room_number,arrival,departure,status,total,currency,source_updated_at';
export type ImportedBooking={channel:string;externalId:string;roomType:string;roomNumber:string|null;arrival:string;departure:string;status:'confirmed'|'cancelled'|'completed';totalCents:number;currency:'CNY';sourceUpdatedAt:string|null};
// Fixed UTF-8 template, one order for one room. Quoted fields support commas/newlines.
export function previewBookingCsv(text:string,today?:string){
 if(text.length>1000000)throw Error('file_too_large');
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false;
 const push=()=>{if(row.length>=10)throw Error('invalid_columns');row.push(field);field='';closed=false};
 text=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
  if(c==='"'){if(field||closed)throw Error('invalid_csv_quotes');quoted=true}
  else if(c===',')push();
  else if(c==='\n'){push();rows.push(row);if(rows.length>1001)throw Error('too_many_rows');row=[]}
  else{if(closed)throw Error('invalid_csv_quotes');field+=c}
 }
 if(quoted)throw Error('invalid_csv_quotes');
 if(field||row.length||closed){push();rows.push(row)}
 if(rows.shift()?.join(',')!==bookingCsvHeader)throw Error('invalid_template');
 if(rows.length>1000)throw Error('too_many_rows');
 const valid:{row:number;booking:ImportedBooking}[]=[],errors:{row:number;reason:string}[]=[],duplicates:number[]=[];
 const seen=new Map<string,string>();
 const date=(s:string)=>/^20\d{2}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 rows.forEach((values,i)=>{
  if(values.every(v=>v===''))return;
  const n=i+2;
  const fail=(reason:string)=>errors.push({row:n,reason});
  if(values.length!==10){fail('column_count');return}
  const [channel,externalId,roomType,roomNumber,arrival,departure,status,total,currency,updated]=values.map(v=>v.trim());
  if(!channel||channel.length>80||!externalId||externalId.length>120||!roomType||roomType.length>60||roomNumber.normalize("NFKC").length>24||/[\u0000-\u001f]/.test(roomNumber)){fail('invalid_identity');return}
  if(!date(arrival)||!date(departure)||departure<=arrival||Date.parse(departure)-Date.parse(arrival)>30*86400000){fail('invalid_dates');return}
  if(!['confirmed','cancelled','completed'].includes(status)){fail('invalid_status');return}
  if(today&&status==='completed'&&departure>today){fail('completed_in_future');return}
  if(currency!=='CNY'||!/^\d{1,9}(\.\d{1,2})?$/.test(total)||Number(total)<=0){fail('invalid_amount_or_currency');return}
  if(updated&&(!date(updated.slice(0,10))||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(updated)||!Number.isFinite(Date.parse(updated)))){fail('invalid_source_time');return}
  const booking:ImportedBooking={channel,externalId,roomType,roomNumber:roomNumber||null,arrival,departure,status:status as ImportedBooking['status'],totalCents:Math.round(Number(total)*100),currency:'CNY',sourceUpdatedAt:updated?new Date(updated).toISOString():null};
  const key=JSON.stringify([channel,externalId]),snapshot=JSON.stringify(booking);
  if(seen.has(key)){if(seen.get(key)===snapshot)duplicates.push(n);else fail('conflicting_duplicate');return}
  seen.set(key,snapshot);valid.push({row:n,booking});
 });
 return {valid,errors,duplicates,counts:{valid:valid.length,invalid:errors.length,duplicate:duplicates.length},canCommit:valid.length>0&&errors.length===0};
}
