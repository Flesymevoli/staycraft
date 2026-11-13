"use client";
import "./booking-import.css";
import {useEffect,useRef,useState} from 'react';
type Preview={counts:{valid:number;invalid:number;duplicate:number};errors:{row:number;reason:string}[];rows?:{channel:string;externalId:string;action:string}[];newRoomTypes?:string[];unmatchedRooms?:string[];canCommit:boolean;revision?:string;saved:boolean};
type State={batches:{id:string;imported_at:string;channels:string[];counts:Record<string,number>;first_arrival:string;last_departure:string}[];tasks:{booking?:{external_channel:string;external_id:string;room_number:string|null;type_name:string}|null;id:string;booking_id:string;kind:string;scheduled_on:string;completed_at:string|null}[]};
export function BookingImport({zh,tasksOnly=false,until}:{zh:boolean;tasksOnly?:boolean;until?:string}){
 const t=(en:string,cn:string)=>zh?cn:en;
 const [expanded,setExpanded]=useState(false);
 const [taskNotice,setTaskNotice]=useState('');
 const [csv,setCsv]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[confirm,setConfirm]=useState(false),[version,setVersion]=useState(0);
 const [loadResult,setLoadResult]=useState<{version:number;state?:State;failed?:boolean}>({version:-1});
 const loading=loadResult.version!==version;
 const state=loading?null:loadResult.state??null;
 const fileVersion=useRef(0);
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('focus',refresh);window.addEventListener('staycraft-stays-changed',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('staycraft-stays-changed',refresh)}},[]);
 useEffect(()=>{const c=new AbortController();fetch('/api/workspace/booking-import?view=state',{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(s=>{if(!Array.isArray(s?.batches)||!Array.isArray(s?.tasks))throw Error();if(!c.signal.aborted)setLoadResult({version,state:s})}).catch(()=>{if(!c.signal.aborted)setLoadResult({version,failed:true})});return()=>c.abort()},[version]);
 const labels:Record<string,string>={new:t('New','新增'),duplicate:t('Unchanged','重复'),updated:t('Changed','修改'),cancelled:t('Cancelled','取消'),arrival:t('Planned arrival','预计入住'),departure:t('Planned departure','预计退房'),unassigned:t('Assign room','需要分房'),changed:t('Review order change','核对订单变化')};
 const rowErrors:Record<string,string>={column_count:t('Wrong column count','列数不符'),invalid_identity:t('Channel, order ID or room type is missing/too long','渠道、订单号或房型缺失/过长'),invalid_dates:t('Invalid dates or stay longer than 30 nights','日期无效或住宿超过30晚'),invalid_status:t('Unknown booking status','订单状态无效'),invalid_amount_or_currency:t('Use positive CNY amounts with at most two decimals','金额须为正数人民币，最多两位小数'),invalid_source_time:t('Use an ISO timestamp with timezone','来源时间须包含时区'),conflicting_duplicate:t('Conflicting rows share the same channel/order ID','同渠道订单号存在冲突行')};
 const errors:Record<string,string>={import_changed:t('Data changed. Preview again.','数据已变化，请重新预览。'),confirm_unversioned:t('Source timestamps are missing. Confirm the replacement below, then preview again.','变更缺少来源时间。确认下方覆盖选项后重新预览。'),stale_source:t('An older or conflicting source was rejected.','已拒绝旧版或同时间冲突数据。'),room_type_unmatched:t('Multiple saved room types share this name. Rename them before importing.','已有多个同名房型，请先区分名称再导入。'),room_type_limit:t('At most 20 room types are supported. Check the names in your CSV.','最多支持 20 个房型，请检查表格中的房型名称。'),room_date_conflict:t("The assigned room has overlapping bookings.","所分配客房存在日期冲突，请核对。"),room_unmatched:t('Check the room number and type.','请检查房号、房型和启用状态。'),manual_stay_conflict:t('An actual stay needs manual review.','已有实际入住或退房记录，请先人工核对。')};
 const run=async(commit:boolean)=>{controller.current?.abort();const c=new AbortController();const timeout=AbortSignal.timeout(20000);controller.current=c;setBusy(true);setNotice('');if(!commit)setPreview(null);try{
  const r=await fetch('/api/workspace/booking-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csv,commit,revision:preview?.revision,confirmUnversioned:confirm}),signal:AbortSignal.any([c.signal,timeout])});const body=await r.json();if(!r.ok)throw Error(body.error);setPreview(body);
  if(body.saved){setNotice(t('Bookings imported.','订单已导入。'));setVersion(v=>v+1);window.dispatchEvent(new Event('staycraft-stays-changed'));window.dispatchEvent(new Event('staycraft-inventory-changed'))}
  else setNotice(body.canCommit?t('Preview ready. Review the rows, then confirm the import below.','校验完成，请核对下方预览，再点击「确认导入」。'):body.counts.valid===0&&body.counts.invalid===0?t('The file contains no booking rows. Fill in the template before importing.','文件里没有订单数据，请填写模板后再导入。'):t('Validation found errors. Check the row details below.','校验发现异常，请检查下方具体行号和原因。'));
 }catch(e){if(!c.signal.aborted){const code=e instanceof Error?e.message:'';
  const message=code==='booking_import_demo_disabled'?t('Use a test account to import bookings. The demo does not accept imports.','演示账号不支持订单导入，请使用测试账号。')
   :code==='invalid_template'||code==='invalid_columns'?t('The CSV columns do not match the template.','CSV 表头不匹配，请使用本页的下载模板。')
   :code==='sign_in_required'?t('Your session expired. Sign in again before importing.','登录已失效，请重新登录后导入。')
   :code==='invalid_csv_quotes'?t('CSV quotation marks are invalid. Export the file as UTF-8 CSV again.','CSV 引号格式有误，请重新导出为 UTF-8 CSV。')
   :code==='too_many_rows'?t('Import at most 1,000 rows at a time.','每次最多导入 1,000 行订单，请拆分文件。')
   :code==='file_too_large'?t('Maximum 1 MB.','文件不能超过 1 MB。')
   :timeout.aborted?t('The request timed out. Check import history before retrying a confirmed import.','请求超时。若已点击确认导入，请先检查导入记录再重试。')
   :errors[code];
  setNotice(message||t('Import unavailable. Your file is retained; no success is assumed.','暂时无法导入，文件内容已保留。'));}}finally{if(!c.signal.aborted)setBusy(false)}};
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
 const [selectedDate,setSelectedDate]=useState(today);
 const due=until||selectedDate;
 const tasks=state?.tasks.filter(x=>!x.completed_at&&x.scheduled_on<=due)||[];
 return <section className="workspace-section booking-import-panel"><h2>{tasksOnly?t('Imported operations','导入运营任务'):t('Import bookings','订单数据导入')}</h2><div className="native-card">
 {!tasksOnly&&<details className="booking-import-disclosure"><summary><span>{t("Import CSV bookings","导入 CSV 订单")}</span><span className="booking-import-disclosure-hint">{t("Expand","展开")}</span></summary><div className="booking-import-form"><p>{t('UTF-8 CSV · one room per order · CNY · up to 30 nights. New room types are added when you confirm the import. Unknown room numbers are retained in the source order without creating inventory.','UTF-8 CSV · 一单一间 · 人民币 · 最长 30 晚。新房型会在确认导入时自动添加；未建档房号保留在原订单中，不自动增加房量。')}</p>
 <a className="inventory-text" href="/api/workspace/booking-import">{t('Download template','下载模板')}</a>
 <label>{t('Choose CSV','选择 CSV 文件')}<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e=>{const fileRequest=++fileVersion.current;const f=e.target.files?.[0];setName('');setPreview(null);setNotice('');setCsv('');setConfirm(false);if(!f)return;if(f.size>1000000){setNotice(t('Maximum 1 MB.','文件不能超过1 MB。'));return}try{const content=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());if(fileRequest!==fileVersion.current)return;setCsv(content);setName(f.name)}catch{if(fileRequest!==fileVersion.current)return;setNotice(t('Use UTF-8 CSV.','请使用 UTF-8 CSV。'))}}}/></label>
 {name&&<p>{name}</p>}<label><input type="checkbox" checked={confirm} disabled={busy} onChange={e=>{setConfirm(e.target.checked);setPreview(null)}}/>{t('I reviewed replacements without source timestamps.','我已核对缺少来源时间的订单覆盖变更。')}</label>
 <p><button className="native-primary" disabled={!csv||busy} onClick={()=>void run(false)}>{busy?t('Processing…','正在处理…'):t('Validate and preview','校验并预览')}</button></p>
 <p role="status">{notice||(busy?t('Checking the request…','正在处理，请稍候…'):!csv?t('Choose a nonempty UTF-8 CSV to enable preview.','请先选择非空的 UTF-8 CSV 文件。'):'')}</p>
 {preview&&<><p>{t('Valid / invalid / duplicates within file','有效 / 异常 / 文件内重复')}：{preview.counts.valid} / {preview.counts.invalid} / {preview.counts.duplicate}</p>
 {Boolean(preview.newRoomTypes?.length)&&<p role="status">{preview.saved?t('Room types added: ','已添加房型：'):t('Room types to add on confirmation: ','确认后将新增房型：')}{preview.newRoomTypes!.join('、')}。{t('Base rates and capacity can be filled in later.','挂牌价、床型和入住人数可稍后补充。')}</p>}
 {Boolean(preview.unmatchedRooms?.length)&&<p>{t('Unregistered room numbers (orders remain unassigned): ','未建档房号（订单暂不分配客房）：')}{preview.unmatchedRooms!.join('、')}</p>}
 {preview.errors.slice(0,20).map(e=><p key={e.row}>{t('Row','第')} {e.row} {t('','行')} · {rowErrors[e.reason]||e.reason}</p>)}
 {preview.rows&&<p>{['new','updated','cancelled','duplicate'].map(action=>`${labels[action]} ${preview.rows!.filter(r=>r.action===action).length}`).join(' / ')}</p>}
 {preview.rows?.slice(0,25).map((r,i)=><p key={i}>{r.channel} · {r.externalId} · {labels[r.action]||r.action}</p>)}
 {preview.canCommit&&!preview.saved&&preview.revision&&<button className="native-primary" disabled={busy} onClick={()=>void run(true)}>{t('Confirm import','确认导入')}</button>}</>}
 </div></details>}
 {taskNotice&&<p role="status">{taskNotice}</p>}
 {loading?<p role="status">{t('Loading import records…','正在读取导入记录…')}</p>:loadResult.failed?<p role="alert">{t('Could not read import records. Please retry.','暂时无法读取导入记录，请重试。')} <button className="inventory-text" onClick={()=>setVersion(v=>v+1)}>{t('Retry','重试')}</button></p>:state&&<>
 {!tasksOnly&&state.batches.length>0&&<details className="booking-import-history"><summary>{t('Import history','导入记录')} · {new Date(state.batches[0].imported_at).toLocaleDateString(zh?'zh-CN':'en-GB',{timeZone:'Asia/Shanghai'})}</summary><p>{t('File coverage only; not live or all-channel data.','仅代表文件覆盖范围，不是实时或全渠道数据。')}</p>{state.batches.map(batch=><p key={batch.id}>{new Date(batch.imported_at).toLocaleString(zh?'zh-CN':'en-GB',{timeZone:'Asia/Shanghai'})} · {batch.channels.join(' / ')} · {batch.first_arrival}—{batch.last_departure} · {Object.entries(batch.counts).map(([action,count])=>`${labels[action]||action} ${count}`).join(' / ')}</p>)}</details>}
 <div className="booking-import-task-heading"><h3>{t('Imported tasks','导入待办')} <span>{tasks.length}</span></h3>{!tasksOnly&&<label><span className="booking-import-date-label">{t('Due by','安排截至')}</span><input aria-label={t('Imported tasks due by','导入待办截至日期')} type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/></label>}</div>
 {!tasks.length&&<p className="booking-import-empty">{t('No imported tasks due.','暂无到期的导入任务。')}</p>}
 {tasks.length>0&&<details className="booking-import-scope"><summary>{t('Task scope','任务范围说明')}</summary><p>{due} · {t('Current task state; at most 200 pending records are loaded.','任务状态为当前，最多读取200条待处理记录。')}</p></details>}
 {tasks.slice(0,expanded?200:20).map(task=><div key={task.id}><p>{task.scheduled_on} · {labels[task.kind]||task.kind} · {task.booking?.external_channel} {task.booking?.external_id||task.booking_id.slice(-6)} · {task.booking?.room_number||t("Unassigned","待分房")}</p><button className="inventory-text" disabled={busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/workspace/booking-import',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:task.id})});if(!r.ok)throw Error();setVersion(v=>v+1);window.dispatchEvent(new Event('staycraft-activity-changed'));setTaskNotice(t('Task marked complete.','导入待办已标记完成。'))}catch{setTaskNotice(t('Task was not confirmed. Retry.','未能确认任务完成，请重试。'))}finally{setBusy(false)}}}>{t('Mark complete','标记完成')}</button></div>)}
 {tasks.length>20&&<button className="inventory-text" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?t('Show less','收起'):t(`Show ${tasks.length-20} more`,`查看更多 ${tasks.length-20} 项`)}</button>}
 </>}
 </div></section>;
}
