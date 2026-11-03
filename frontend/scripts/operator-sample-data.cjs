// Fictional operator dataset. No cloud client, credentials, SQL or filesystem writes.
const propertyId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ownerId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function createSample(anchor=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),options={}){
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
  const base={anchor,ownerId,propertyId,profile:{name:'湖畔小筑 · 虚构演示',location:'江苏省苏州市太仓市沙溪古镇周边（虚构演示地址）',roomCount:'',breakfast:'07:30–10:00',checkin:'15:00',notes:'全部为虚构演示资料。全屋禁烟，早餐在一楼餐厅。'},inventory:{types,rooms},bookings:[
    booking(1,0,0,2,'林小夏（虚构）'),
    booking(2,2,-2,0,'陈小舟（虚构）'),
    booking(3,4,1,3,'周小雨（虚构）'),
    booking(4,1,0,1,'许知遥（虚构）','cancelled','auto_cancelled'),
    booking(5,3,0,1,'宋听澜（虚构）','confirmed','review_pending'),
  ]};
  if(!options.rich)return base;
  // Date-relative fictional snapshots; they never represent scraped or live OTA orders.
  let sequence=20;
  const random=(offset,room)=>(Math.abs(offset*17+room*13+7)%10)/10;
  const enriched=(n,room,from,to,name,status='confirmed',refund=null)=>{
    const b=booking(n,room,from,to,name,status,refund),weekend=[0,5,6].includes(new Date(day(from)+'T12:00:00Z').getUTCDay());
    b.nightly_rate=Math.round(b.nightly_rate*(weekend?1.12:.94)*100)/100;b.total=Math.round(b.nightly_rate*(to-from)*100)/100;
    b.created_at=day(Math.min(-1,from-Math.min(14,3+n%12)))+'T08:20:00Z';
    b.stay_state=status==='confirmed'&&to<0?'completed':status==='confirmed'&&from<0&&to>=0?'checked_in':'pending';
    b.checked_in_at=b.stay_state==='pending'?null:day(from)+'T07:00:00Z';b.checked_out_at=b.stay_state==='completed'?day(to)+'T03:00:00Z':null;
    return b;
  };
  base.bookings=base.bookings.map((b,i)=>({...b,stay_state:i===1?'checked_in':'pending',checked_in_at:i===1?day(-2)+'T07:00:00Z':null,checked_out_at:null}));
  base.bookings.push(enriched(sequence++,4,-1,1,'苏小禾（虚构）'),enriched(sequence++,1,0,1,'陆予安（虚构）'),enriched(sequence++,3,-1,0,'程见山（虚构）'));
  base.bookings.push(enriched(sequence++,0,-2,-1,'近期住客甲（虚构）'),enriched(sequence++,1,-2,-1,'近期住客乙（虚构）'),enriched(sequence++,4,-2,-1,'近期住客丙（虚构）'));
  for(let from=-42;from<=-4;from+=2){
    for(let room=0;room<5;room++){
      const weekend=[0,5,6].includes(new Date(day(from)+'T12:00:00Z').getUTCDay());
      if(random(from,room)>(weekend?.86:.62))continue;
      base.bookings.push(enriched(sequence++,room,from,from+1+(sequence%2),`历史住客${sequence}（虚构）`));
    }
  }
  for(let from=3;from<=28;from+=2){
    for(let room=0;room<5;room++){
      const weekend=[0,5,6].includes(new Date(day(from)+'T12:00:00Z').getUTCDay()),threshold=from>14?(weekend?.6:.3):(weekend?.9:.5);
      if(random(from,room)>threshold)continue;
      base.bookings.push(enriched(sequence++,room,from,from+1+(sequence%2),`预订住客${sequence}（虚构）`));
    }
  }
  base.bookings.push(enriched(sequence++,0,-9,-7,'已取消住客（虚构）','cancelled','auto_cancelled'),enriched(sequence++,2,7,9,'取消审核通过（虚构）','cancelled','review_approved'));
  base.profile.notes='全部为虚构演示资料，演示日期随当天更新，包含近42天历史与未来28天预订。全屋禁烟，早餐在一楼餐厅。';
  return base;
}
module.exports={createSample};
