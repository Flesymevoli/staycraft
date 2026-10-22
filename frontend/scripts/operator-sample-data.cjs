// Fictional operator dataset. No cloud client, credentials, SQL or filesystem writes.
const propertyId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ownerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function createSample(anchor=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
  const parsed=new Date(anchor+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor)||Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==anchor)throw new Error('Invalid sample date');
  const day=offset=>{const d=new Date(parsed);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
  const types=[
    {id:id(1),name:'花园大床房',beds:'1 张大床',capacity:2,price:520,photo:''},
    {id:id(2),name:'庭院双床房',beds:'2 张单人床',capacity:2,price:580,photo:''},
    {id:id(3),name:'湖景家庭房',beds:'1 张大床 + 1 张单人床',capacity:3,price:760,photo:''},
  ];
  const rooms=[['101',0,'clean',true],['102',0,'dirty',true],['103',1,'clean',true],['201',1,'dirty',true],['202',2,'clean',true],['203',2,'clean',false]].map(([number,type,housekeeping,active],i)=>({id:id(10+i),number,floor:number.startsWith('1')?'1楼':'2楼',typeId:types[type].id,housekeeping,active}));
  const booking=(n,roomIndex,from,to,name,status='confirmed',refund_result=null)=>{const room=rooms[roomIndex],type=types.find(t=>t.id===room.typeId);return {id:id(30+n),property_id:propertyId,room_id:room.id,room_number:room.number,rooms:{number:room.number},type_id:type.id,type_name:type.name,arrival:day(from),departure:day(to),guest_name:name,expected_arrival:'18:00 前',nightly_rate:type.price,total:type.price*(to-from),status,refund_result,created_at:day(-3)+'T04:00:00Z'}};
  return {anchor,ownerId,propertyId,profile:{name:'湖畔小筑 · 虚构演示',location:'示例湖畔路 18 号（虚构）',roomCount:'',breakfast:'07:30–10:00',checkin:'15:00',notes:'全部为虚构演示资料。全屋禁烟，早餐在一楼餐厅。'},inventory:{types,rooms},bookings:[
    booking(1,0,0,2,'林小夏（虚构）'),
    booking(2,2,-2,0,'陈小舟（虚构）'),
    booking(3,4,1,3,'周小雨（虚构）'),
    booking(4,1,0,1,'许知遥（虚构）','cancelled','auto_cancelled'),
    booking(5,3,0,1,'宋听澜（虚构）','confirmed','review_pending'),
  ]};
}
module.exports={createSample};
