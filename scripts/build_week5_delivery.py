from pathlib import Path
from xml.sax.saxutils import escape
import shutil, zipfile
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'deliverables/week5'
OUT = BASE / 'submission_pack'
OUT.mkdir(exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Title2',fontName='Helvetica-Bold',fontSize=22,leading=27,textColor=colors.HexColor('#17263D'),spaceAfter=15))
styles.add(ParagraphStyle(name='Head2',fontName='Helvetica-Bold',fontSize=12,leading=16,textColor=colors.HexColor('#2365B6'),spaceBefore=12,spaceAfter=7))
styles.add(ParagraphStyle(name='Body2',fontName='Helvetica',fontSize=10,leading=15,textColor=colors.HexColor('#26384B'),spaceAfter=8))
styles.add(ParagraphStyle(name='Small2',fontName='Helvetica',fontSize=8,leading=11,textColor=colors.HexColor('#536579'),spaceAfter=6))
story=[]
def p(t,sty='Body2'): return Paragraph(t,styles[sty])
def title(n,t,sub):
    story.extend([p('HOMESTAY AI ASSISTANT  /  WEEK 5  /  '+n,'Small2'),p(t,'Title2'),p(sub)])
def h(t): story.append(p(t,'Head2'))
def para(t): story.append(p(t))
def table(headers,rows,widths):
    data=[[p(escape(str(v)),'Small2') for v in row] for row in [headers]+rows]
    t=Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EAF2FC')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),.5,colors.HexColor('#DDE4EC'))]))
    story.extend([t,Spacer(1,8)])
def picture(name,maxh=240):
    path=BASE/name
    w,hh=ImageReader(str(path)).getSize(); scale=min(499/w,maxh/hh)
    story.extend([Image(str(path),w*scale,hh*scale,hAlign='CENTER'),Spacer(1,7)])
def page(): story.append(PageBreak())

title('01','Data model','Paper Task 1 companion - aligned with the saved build log and database screenshot.')
para('One property has many bookings; one guest has many bookings; one booking has many guest requests. Store shared information once and connect records through Linked Record fields.')
table(['Table','Fields and types'],[
['Properties','Name: Short Text; Location: Short Text; Rooms: Number; Check-in time: Short Text; Breakfast hours: Short Text'],
['Guests','Name: Short Text; Email: Email; Phone: Short Text'],
['Bookings','Booking code: Short Text; Room: Short Text; Check-in date: Date; Status: Select; Guest: Linked Record -> Guests; Property: Linked Record -> Properties'],
['Guest Requests','Name: Short Text; Description: Long Text; Status: Select (Todo / In progress / Done); AI Summary: Long Text; Owner decision: Long Text; Booking: Linked Record -> Bookings']],[105,394])
h('Draw these three links')
table(['Relationship','Field that stores the link'],[
['Properties 1 -> many Bookings','Bookings.Property -> Properties (Linked Record)'],
['Guests 1 -> many Bookings','Bookings.Guest -> Guests (Linked Record)'],
['Bookings 1 -> many Guest Requests','Guest Requests.Booking -> Bookings (Linked Record)']],[239,260])
h('Three paper walk-throughs')
para('<b>1. Breakfast question:</b> store the question in Guest Requests; link the booking; follow its Property link to Breakfast hours. Keep the sample reply in AI Summary.')
para('<b>2. Early arrival:</b> open the existing request, record a room-readiness check in Owner decision, and change Status to In progress. Keep the original request.')
para('<b>3. Cancellation question:</b> follow Booking to identify the stay. Record the next verification step and update request Status. A request marked Done does not establish that a refund was issued.')
h('Model reconciliation')
para('This replaces the earlier illustrative field names (Request / AI draft). The saved implementation uses Name, Description and AI Summary. A Cancel policy field is not established by the build record; cancellation rules must be checked separately. Verify the live linked-field names and types before photographing the final group sheet.')
story.append(p('Course reference: Week 5 slides 11-17 and 21-26. This digital reference is not evidence of group handwriting, peer review or live schema verification.','Small2'))
page()

title('02','App map & first-feature journey','Paper Task 2 companion - the Week 5 scope is the prototype Work flow.')
table(['Screen / access','Reads','Action and effect'],[
['Login / visitor','Softr application users','Log in -> authenticate and enter the protected feature page. Sign up link -> registration.'],
['Sign up / visitor','Softr application users','Submit valid registration -> create an application-user account, subject to configured authentication. Separate-account flow still to test.'],
['Home / Work: Guest requests / logged-in operator','Guest Requests: Name, Description, Status, AI Summary, Booking','Search and filter -> change displayed results. Handle request -> open the selected record in an edit form.'],
['Handle request / logged-in operator; modal, not a separate page','Selected Guest Requests record: Status, Owner decision','Save decision -> edit these fields on the same record. Cancel -> close without saving.'],
['Add record / visible in saved preview; unverified action','Actual form fields require live inspection','Do not use this as the assessed feature until its configuration and save behavior are tested.']],[132,159,208])
h('Meaningful feature statement')
para('A homestay operator can review a guest request and a sample AI suggestion, save a decision and update the request status, so that follow-up is visible and the request does not remain unresolved.')
table(['Stage','What happens'],[
['User action','The operator opens Early check-in - GH-102 and reviews the request and sample suggestion.'],
['App processing','The list reads the selected Guest Requests record. The edit action requires Status and Owner decision, then writes them back to that same record.'],
['Result','The updated status appears in the list. Reopening the edit form shows the saved decision.'],
['User benefit','The operator knows what has been decided and what still needs follow-up.']],[105,394])
h('Connection to the original prototype')
para('This implements a small part of Work: request handling and operator takeover. Automatic AI replies, OTA changes, refunds, Analysis and Explore remain future scope. AI Summary currently contains stored examples; it is not live AI generation.')
story.append(p('Softr application users are operators; Guests are accommodation customers stored in the database. They are different concepts. Do not claim per-property user isolation until it is verified with two accounts.','Small2'))
page()

title('03','Weekly log content','English content draft for Form 1 - transfer after checking the actual UNO form fields.')
h('Objective and completed build')
para('The Week 5 objective was to connect login with one meaningful data-changing feature. The saved build record reports four linked Softr tables, five fictional guest requests, email login with open sign-up, and a protected request page. The Handle request form records Status and Owner decision.')
h('Progress and evidence')
para('The earlier preview test used Softr Test User. Saving an empty decision showed a required-field error. Saving an early-check-in decision with In progress updated the record; reopening it retained both values. The demonstration record was then restored. These are historical test observations from the build log, not a new test on 20 October.')
h('Design decision and learning')
para('We selected request handling because it supports the wider AI-assisted operations concept while keeping the first implementation small. Linked records separate reusable guest and property information from each booking and request. Saving a decision provides a verifiable state change that a static prototype cannot demonstrate.')
h('Current limitations and next steps')
para('Second-account sign-up/login, access checks and an unassisted classmate test are still outstanding. The application remains unpublished at the project leader\'s request. The live plan/trial status and edit-action availability need checking before presentation. The UNO guide could not be reopened during this preparation because the session required login.')
h('AI use declaration')
para('AI assisted with the data model, fictional records, Softr configuration, interface wording, documentation and test preparation. The build log also records a preview save/reopen test performed with assistance. Product reply suggestions are static examples. Team members still need to inspect the configuration, understand the relationships and describe their own contributions accurately.')
h('Participation and reflection status')
para('Member responses and individual reflections were not available at preparation time. No member contribution, peer feedback or independent usability result is claimed. Each member should add: the part actually completed, one thing learned, an obstacle and its resolution, AI assistance used, and the next action.')
story.append(p('The course slides 2-6 expect students to build through the visual editor and understand their work. This pack does not certify that assisted configuration satisfies the individual participation requirement. Form 1 has not been submitted.','Small2'))
page()

title('04','Tests & live demonstration','Distinguish prior observations from checks that still need to run.')
table(['Check','Result / evidence','Next action'],[
['Blank decision','Historical build-log PASS: required-field error. Screenshot of validation not saved.','Capture the validation message in the live form.'],
['Save and reopen','Historical build-log PASS for early check-in; reset afterwards.','Repeat and capture saved state plus reopened decision.'],
['Five sample records','Existing Data screenshot shows five realistic requests and four table tabs.','Check every link opens the intended record.'],
['Authentication settings','Existing screenshots show login/email settings and open sign-up.','Test actual sign-up and login with a second account.'],
['Access control','Protection is reported in the build log; two-account behavior not established.','Test signed-out access and both users; define who should see each record.'],
['Peer usability','NOT RUN: no classmate feedback available.','Ask a peer to handle one request unaided; record difficulty and change.'],
['Free plan / live retest','NOT VERIFIED on 20 October; editor connection timed out.','Check plan status and test that the edit action still works.']],[112,211,176])
h('Three-minute live demonstration')
para('<b>0:00-0:30:</b> State the problem: guest requests need a clear next action. Show the four-table model and explain Booking as the link between guest, property and request.')
para('<b>0:30-1:00:</b> Demonstrate actual login with the prepared test account. Explain that Preview as Test User alone does not prove sign-up works.')
para('<b>1:00-2:00:</b> Open Early check-in - GH-102. Review the stored suggestion, set In progress, and enter: “Check room readiness with housekeeping before confirming arrival.” Save.')
para('<b>2:00-2:30:</b> Reopen the same request and show the saved values. Explain the benefit: the next action is recorded and visible.')
para('<b>2:30-3:00:</b> Explain that live AI generation is the next step. Show the actual test record and limitation list. Restore the fictional sample after testing.')
story.append(p('Before changing a test record, note its original status and decision. Keep demonstration actions within fictional data. A saved processing decision is not a guest message or a financial transaction.','Small2'))
page()

title('05','Evidence: data & feature','Existing screenshots from the earlier build; not newly captured on 20 October.')
picture('Softr_Week5_Data.png',265)
para('<b>E1 - Data:</b> four table tabs and five guest requests. Linked-field configuration is outside the visible columns, so this image does not prove every relationship is configured correctly.')
picture('Softr_Week5_Preview.png',265)
para('<b>E2 - Preview:</b> the request list, status and booking filters, and Handle request action. This is a historical UI; later styling may differ.')
page()

title('06','Evidence: authentication','Settings evidence supports configuration, not a completed second-account login test.')
picture('Softr_Week5_Authentication.png',265)
para('<b>E3 - Authentication:</b> existing capture of the authentication configuration.')
picture('Softr_Week5_Signup.png',265)
para('<b>E4 - Sign-up:</b> existing capture of the sign-up setting. Add separate-account registration and successful login evidence after testing.')
page()

title('07','Evidence & remaining hand-in items','Prepared materials are complete; the items below still require real interaction or participation.')
picture('Softr_Week5_Handle_Request.png',255)
para('<b>E5 - Edit form:</b> Status and Owner decision are required; Save decision is visible. The image does not show the later saved or reopened state.')
table(['Course item','Status at preparation'],[
['Paper data model and App Map photos','Digital reference prepared in pages 1-2; actual group-drawn photos remain required.'],
['Cross-group review','Still needs three lines of real feedback and a recorded response/change.'],
['Login + Feature 1 live','Feature has a historical preview test. Second-account and current live tests remain.'],
['Kanban with a Done card','Card text prepared separately; board left unchanged per prior instruction.'],
['Weekly log (Form 1)','Content prepared on page 3; exact UNO fields and upload pending login.'],
['Each person teaches / reflects','Proposed responsibilities supplied separately; personal contributions and reflections pending.'],
['Publish / final submission','Not performed. Publishing remains paused under the existing instruction.']],[185,314])
story.append(p('Source: ENT207TC Week 5 Login and First Feature v3, especially slides 15-17, 22-33. Supporting record: Week5_Build_Log_and_Evidence.md. UNO Full Guide was not accessible for a fresh verification on 20 October 2026.','Small2'))

def footer(c,doc):
    c.setStrokeColor(colors.HexColor('#DDE4EC'));c.line(48,40,547,40)
    c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#607086'))
    c.drawString(48,27,'Homestay AI Assistant | Prepared 20 October 2026 | Evidence-led draft')
    c.drawRightString(547,27,str(doc.page))
pdf=OUT/'Week5_Delivery_Pack.pdf'
SimpleDocTemplate(str(pdf),pagesize=(595.28,841.89),rightMargin=48,leftMargin=48,topMargin=42,bottomMargin=54).build(story,onFirstPage=footer,onLaterPages=footer)

log='''# Week 5 weekly log - content for Form 1

Prepared 20 October 2026. The exact UNO form fields still require checking after login. This file is editable; do not describe it as an uploaded Form 1.

## Goal
A homestay operator can review a guest request and a sample AI suggestion, save a decision and update its status, so that the next action is clear.

## Build completed according to the existing record
Four Softr tables (Properties, Guests, Bookings and Guest Requests), five fictional requests, email login, open sign-up and a protected feature page. The Handle request edit action saves Status and Owner decision on the selected record. This is the first part of the prototype's Work flow.

## Testing already recorded
The previous preview test with Test User rejected an empty decision, accepted a valid decision with In progress, and retained both values when reopened. The sample record was restored afterwards. This is an earlier observation, not a fresh test on 20 October. The screenshots document the list, form, data and authentication settings; saved-state evidence still needs capturing.

## Decisions and learning
Request handling was selected because it demonstrates a useful data change within the wider AI-assisted operations concept. Linked records connect reusable guest/property data to bookings and requests. A saved owner decision makes follow-up visible. Static AI Summary examples do not demonstrate a live AI service.

## Outstanding checks
Second-account registration/login, signed-out and two-user access, all linked records, unassisted peer testing, and current Free-plan availability. Publishing is paused by the leader. Digital model and App Map are ready as references; authentic paper photos and cross-group feedback remain outstanding.

## AI use
AI assisted with the model, fictional records, Softr configuration, wording, documentation and testing preparation. Prior assisted preview testing is recorded above. Members must verify and understand the configuration and report their actual work. The course expects hands-on visual-editor work; this pack does not replace that participation.

## Individual reflections - awaiting each person
Name:
Part actually completed:
What I learned and can explain:
Obstacle / error and how I addressed it:
AI assistance used and what I changed:
Evidence of my own work:
Next step:

## Peer feedback - not collected
Reviewer / group:
Where each of the three situations is stored:
Information repeated unnecessarily:
Record that should be linked:
Our decision and resulting change:
'''
(OUT/'Week5_Form1_Content_EN.md').write_text(log,encoding='utf-8')
handoff='''# Week 5 交付入口（2026-10-20）

先看 Week5_Delivery_Pack.pdf：1 数据模型、2 App Map 与用户旅程、3 英文周志、4 测试与展示、5-7 已有截图和剩余事项。

## 已经准备好
- 补齐 Paper Task 2 的 App Map，写清页面、读取字段、按钮作用和访问身份。
- 重新核对纸面数据模型：与构建记录一致地采用 Name / Description / AI Summary。之前图里的 Cancel policy 不是已验证字段，本版不将其写成已建。
- 英文周志与 AI 使用记录，可从 Week5_Form1_Content_EN.md 复制到实际 Form 1。
- 课堂演示顺序、历史测试结果与待验证项。
- 五张原始证据截图及其说明。截图是先前留存的，不是今天新测的结果。

## 仍不能标成完成
1. 实际登录：第二账号注册登录、退出后访问检查，以及两个用户应看到什么。
2. 当前功能复测：保存再打开，补截图；检查试用结束后功能是否可用。
3. 真实纸面证据：按参考图共同画数据模型和 App Map，拍照；数字 PDF 不冒充手绘照片。
4. 同伴反馈、无指导试用和每个人的个人反思，必须来自实际参与。
5. Kanban 更新及 Form 1 上传尚未执行。延续你的要求，不修改看板、不发布 Softr。

UNO 当前需要重新登录；Softr 编辑器读取超时。因此没有把在线复测与 Full Guide 的最新上传字段写成已核验。

## 其他五位组员：建议认领任务（不是已完成记录）
| 组员 | 负责范围 | 最小实际动作 | 带回来的东西 / 要能讲清什么 |
|---|---|---|---|
| 组员 1 | 基础数据 | 核对 Properties、Guests 字段和类型，参与纸面图 | 一张字段截图；解释一条记录与一个字段 |
| 组员 2 | 关系数据 | 核对 Bookings 的 Property / Guest 关联，点开两条不同订单 | 关联截图；解释为何用 Linked Record |
| 组员 3 | App Map 与功能 | 核对 Guest Requests，画页面到保存的路径，运行一次编辑 | App Map 照片；说明保存修改哪一张表 |
| 组员 4 | 登录和权限 | 参与一张表的核对；用本人测试账号完成注册、登录、退出检查 | 实际通过/失败记录；解释访客和经营者区别 |
| 组员 5 | 测试和互教 | 参与一张表的核对；找一位同学无提示处理请求，收集反馈 | 原话/卡点/调整记录；解释为何需要复测 |

每人需参与至少一张表，可两人共同完成同一表；再用自己的话写反思。组长负责整合和展示。未回复成员不登记为已贡献。

## 看板卡片文字（供核对后复制，未写入看板）
- Data model & App Map：数字参考已准备；真实纸面图、字段逐项比对和组间互评待完成。
- Feature 1：历史预览保存/重开测试通过；当前重测和保存态截图待补。
- Authentication：配置截图已有；第二账号注册登录和权限测试待完成。
- Weekly evidence：文档和截图包已整理；个人反思、最终 Form 1 和上传待完成。

课件要求至少一张卡移到 Done。只能把范围真正完成的卡移过去，例如“整理交付文档与既有截图”；不要把未测试的登录或未完成的组员任务移到 Done。
'''
(OUT/'开始这里_交付与分工.md').write_text(handoff,encoding='utf-8')
e=OUT/'evidence'; e.mkdir(exist_ok=True)
for name in ['Softr_Week5_Data.png','Softr_Week5_Preview.png','Softr_Week5_Handle_Request.png','Softr_Week5_Authentication.png','Softr_Week5_Signup.png']:
    shutil.copy2(BASE/name,e/name)
shutil.copy2(BASE/'Week5_Build_Log_and_Evidence.md',OUT/'Historical_Build_Log.md')
archive=BASE/'Homestay_AI_Week5_Delivery_Pack.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(OUT.rglob('*')):
        if f.is_file(): z.write(f,f.relative_to(OUT))
print('Created PDF, editable content, handoff and ZIP.')
