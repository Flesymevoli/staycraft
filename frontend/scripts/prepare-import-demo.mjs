// Fictional software demonstration fixtures, isolated from operational records.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {bookingCsvHeader} from '../src/lib/booking-csv.ts';
if(process.argv[2]!=='--prepare-demo')throw Error('explicit_demo_only');
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
const day=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const now=new Date(),old=new Date(now.valueOf()-3600000).toISOString(),stamp=now.toISOString();
const row=(id,a,d,status,total,time)=>['DEMO',id,'花园大床房','',a,d,status,total,'CNY',time].join(',');
const initial=[row('DEMO-A1',today,day(1),'confirmed','300.01',old),row('DEMO-B1',day(2),day(4),'confirmed','600',old),row('DEMO-H1',day(-6),day(-4),'completed','100.01',old)];
const changes=[row('DEMO-A1',today,day(1),'cancelled','300.01',stamp),row('DEMO-B1',day(2),day(5),'confirmed','800',stamp),row('DEMO-H1',day(-6),day(-4),'completed','100.01',stamp),row('DEMO-C1',day(6),day(7),'confirmed','320',stamp)];
const root=path.resolve(import.meta.dirname,'../../deliverables/demo-day');await mkdir(root,{recursive:true});
for(const [name,rows] of [['01-fictional-initial.csv',initial],['02-fictional-changes.csv',changes],['03-invalid-date.csv',[row('DEMO-ERROR','2026-02-30',day(1),'confirmed','100',stamp)]]])await writeFile(path.join(root,name),'\uFEFF'+bookingCsvHeader+'\r\n'+rows.join('\r\n')+'\r\n');
await writeFile(path.join(root,'演示步骤.md'),`# StayCraft 导入演示\n\n全部为虚构测试订单，日期基准 ${today}。仅在3114隔离演示使用，不上传真实经营账号。\n\n1. 运行 frontend/scripts/start-import-sample.cjs，登录 demo@example.invalid / staycraft-demo。\n2. 工作页上传01，预览后确认。观察新增订单、未分房任务和来源覆盖。\n3. 再次上传01，应全部识别为重复且不增加任务。\n4. 完成一个任务，再上传02，观察取消、改期、新增，以及原完成记录保留。来源时间更新但内容未变的历史订单仍是重复。\n5. 上传03，日期错误阻止保存，原记录保持。\n6. 分析选择过去一周，查看已完成订单金额/间夜；历史房量未知时不显示占用率。\n7. 探索中核对参考信息，梳理行动建议，审核并保存，再从草稿库打开。\n8. 返回首页查看运营活动和待办。任务完成不代表入住、退房或清洁完成。\n\n演示没有真实OTA、收付款或模型调用；竞品示例与真实本机试采隔离。停止并重新运行该专用服务会还原本次内存数据。\n`);
console.log('Prepared fictional CSV demonstration fixtures under deliverables/demo-day. No operational data changed.');
