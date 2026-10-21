# Homestay AI｜技术架构与开发约束

版本：v1.2 · 2026-10-15  
对应 [PRD.md](PRD.md) 与 [DESIGN.md](DESIGN.md)。本文件区分**已选技术方案**与**当前已实现内容**，避免把五页演示误写成可上线系统。

## 1. 技术选型与当前状态

- **前端：** Next.js App Router + React + TypeScript + Tailwind CSS。仓库目前使用 Next.js 16.3.6、React 19.2.8、Tailwind 4；页面视觉主要由 `native-*.css` 实现，Tailwind 已安装但不是现有组件的主要样式写法。需要复杂表单、弹窗等组件时可有选择地引入 shadcn/ui，须遵循 [DESIGN.md](DESIGN.md) 令牌，不整站替换现有视觉。
- **后端：** Python + FastAPI + Pydantic。已建立咨询判断接口、保守规则，以及 Supabase 令牌与民宿成员资格核验接口；已接入可配置的模型草稿接口并用虚构数据验证 DeepSeek；真实云端账号、业务数据和消息渠道待接入。前后端放在同一个仓库，分别在 `frontend/` 与 `backend/`，便于接口和文档同步，但独立构建、部署。
- **数据库与登录：** 选用 Supabase 托管的单个 PostgreSQL 数据库及 Supabase Auth。正式 MVP 不引入 Redis、第二套数据库或复杂任务队列；等待云端配置期间允许独立的 SQLite 单机开发适配器；持久数据在数据库，短期 UI 状态留在前端。数据库变更用版本化迁移管理，开发环境与正式环境隔离。Supabase 是数据与认证服务，**不是 FastAPI 的运行环境**。
- **部署目标：** 前端 Vercel、FastAPI Render Web Service、数据/认证 Supabase。此处是后续上线方案，不代表现在已经部署；发布前再核对地区、费用、环境变量和服务可用性。Softr 课程演示保持独立，不作为这套代码的运行时。
- **AI：** 第一阶段直接通过服务端模型 SDK 和可替换的 provider 接口调用，不引入 LangChain；具体模型按回复质量、延迟、成本和数据处理要求测试后配置。模型密钥只在后端环境变量中。
- **当前运行形式：** `frontend/` 五页本地交互原型，加独立的 `/login` 与受保护 `/app` 占位入口。`src/app` 负责路由，`src/components` 放页面客户端组件和样式，`public` 放字体、图标和示例图片。`/legacy` 是归档单文件的对照预览，不是新功能入口。
- **当前数据：** 五页原型主要使用固定示例与 `sessionStorage` 会话状态；Mine 回复依据与 Work 新咨询已使用独立 SQLite 本机资料；`useDemoStorage` 管理部分语言、资料、决策和草稿。已有认证代码和第一条后端接口，但没有已配置的真实账号、民宿数据、支付、预订或 OTA 接口。

## 2. 当前目录与目标边界

| 目录/层 | 现在 | 开发时约束 |
| --- | --- | --- |
| `frontend/src/app/` | 五页路由与布局 | 保持路由薄，只组织页面与服务端入口；不把业务规则写进页面文件。 |
| `frontend/src/components/` | 页面组件、图表、`demo-storage.ts`、CSS | 抽取共用导航、卡片、状态组件；展示组件不直接持有真实密钥或调用第三方敏感接口。 |
| `frontend/public/` | 示例图片、字体、图标、旧版预览 | 仅公开静态资产；不放客人资料、凭据、真实订单或内部导出数据。 |
| `backend/` | `/v1/reply-decisions` 和 `/v1/demo/operation-advice` 只读演示接口、`/v1/properties/{id}/access` 权限核验接口及测试 | 后续增加数据访问和 AI/外部平台适配器；不把业务规则塞进路由处理函数。 |
| `supabase/` | 民宿和成员资格的首份迁移，尚未在真实项目执行 | 版本化数据库迁移与开发配置；不提交密钥或真实客人数据。 |
| `docs/` | PRD、设计、架构 | 产品决策先更新文档，再修改实现；不把旧归档文件当当前规范。 |
| `archive/` | 早期原型和旧文档 | 仅供追溯；不引入生产构建链。 |

增加持久化时，隔离出**领域模型、应用服务、数据访问适配器和外部服务适配器**。Next.js 页面经类型明确的 HTTP API 调用 FastAPI，FastAPI 负责业务规则并访问 Supabase PostgreSQL；前端只保留认证所需的公开配置，不能接触数据库管理密钥。UI 依赖稳定的 API 对象与状态，替换示例数据时不重写页面结构。先用一个 FastAPI 服务和一个数据库完成首条用户旅程，不提前拆微服务。

## 3. 最小数据模型与状态

以下为正式 MVP 的**逻辑模型**，不是已建好的表：

| 实体 | 必要字段/关系 | 约束 |
| --- | --- | --- |
| `Property` / `PropertyFact` | 民宿 ID；事实类型、值、来源、更新时间、审核状态 | 回复只能引用已确认且适用的事实；变更要可追溯。 |
| `Conversation` / `Message` | 会话 ID、客人引用、渠道、发送者、时间、内容、发送状态 | 客人消息与 AI 草稿/已发送、经营者补充须区分；控制个人信息访问。 |
| `Booking` / `OperationDecision` | 订单引用、申请类型、规则版本、建议动作、经营者选择、执行状态 | 决策、外部执行、回执分别记录；不能以点击按钮替代真实成功。 |
| `MetricSnapshot` | 指标名、值、单位、周期、计算口径、来源、更新时间 | 自身指标与市场信号分开；缺失或过期不可静默使用。 |
| `LocalSignal` | 日期、地点、线索类型、来源、核验状态 | 虚构示例与真实活动不能混淆；生成内容前检查有效性。 |
| `PromotionDraft` | 渠道、引用的事实/线索、正文、编辑者、保存状态 | 保存、审核、发布是不同状态；不自动发布。 |

服务状态至少包括 `idle`、`loading`、`ready`、`empty`、`needs_review`、`failed`；对外动作另有 `pending`、`succeeded`、`rejected/failed`，并保存操作时间与外部回执。前端不得仅凭按钮点击把订单、退款、发送或发布显示为成功。

## 4. 服务层约定

正式接口按用户任务组织，而不是按五页各建一套数据：

1. **Property service：** 读取与修改民宿事实；上传解析结果先形成候选变更，经营者逐项确认后才生效。
2. **Conversation service：** 列表、详情、人工补充；接收新消息后判定自动回复是否开启，再请求 AI 服务，发送结果必须有渠道回执。资料不足、冲突或需承诺时转待处理。
3. **Operations service：** 整理入住/退款申请和适用规则，生成建议；经营者确认后才调用外部订单/支付适配器；状态以外部回执为准。外部重试需避免重复退款或重复发送。
4. **Insights service：** 计算自身入住/预订指标，并取有来源的市场和客人反馈；返回值同时带周期、单位、口径与数据时间。总结引用同一份指标快照，不另造数字。
5. **Promotion service：** 组合已核实的线索与经营目标形成草稿；编辑、保存与发布分别授权。生成失败保留输入，用户可重试或手写。

接口返回统一包含结果、来源/更新时间（适用时）和可区分的错误状态。页面不直接推断“AI 已发送”“退款已完成”等外部成功。登录采用 Supabase Auth；Next.js 获取会话后把访问令牌提交给 FastAPI，后端验证签名、签发者、有效期及民宿访问权限，不能信任前端传来的用户 ID。读写操作按民宿与用户权限隔离；真实客人资料最小化收集、限制日志输出并设定保留期限。

当前 `/v1/properties/{id}/access` 通过 Supabase Auth `/auth/v1/user` 核验令牌，再以该令牌查询受 RLS 保护的 `property_memberships`，不信任客户端给出的用户 ID。`/v1/reply-decisions` 仍是**公开、只读、接受调用方示例事实的演示接口**，不得用于真实客人消息或自动发送。真实业务资料接口必须复用民宿权限依赖，并从数据库读取已确认事实。配置与实际联调见 [AUTH_SETUP.md](AUTH_SETUP.md)。

为在等待 Supabase 项目期间验证首条流程，`/api/demo/reply-decision` 可在 Next.js 服务端组装固定的演示事实并代理到 FastAPI 的公开规则接口。这个演示入口不得接收客户端提供的事实、不得保存或发送客人消息；后端不可用时返回明确失败状态。它不属于 `/app` 的正式授权数据通路。

例外事务的独立演示同样由 Next.js 服务端按任务 ID 组装固定示例订单，代理到 FastAPI 的**只读建议接口**。后端返回建议、规则依据和待核实项，不修改订单或资金；Work 只在浏览器会话中记录经营者的拟定决定。未来正式服务必须从授权民宿的订单与规则表读取，禁止信任客户端传来的金额、日期或执行状态。

## 5. AI 调用机制

模型只能经 FastAPI 服务端调用；密钥、提示词中的内部规则和第三方凭据不得暴露在客户端或 `public/`。生成前组合：用户请求、已审核民宿事实、可用订单/政策和必要的渠道上下文；生成后返回**草稿、引用依据、信心/缺失项与是否需人工审核**。对早餐时间等低风险常见问题，可在规则与来源充分时自动发送；涉及退款、入住承诺、合作方可用性、价格或发布时转人工或受明示授权的受控流程。输出需保留模型/规则版本及处理记录，以便复核。

现有 Work 客人对话是硬编码示例，Mine 编辑值尚未驱动其回复。现有 `/v1/reply-decisions` 只根据**请求携带的**已确认资料，对早餐/常规入住时间给出规则草稿或转人工决定；`auto_reply_ready` 表示具备后续发送资格，`sent` 永远为 `false`。它不是模型生成，也不能作为客户端授权。下一步需打通 Mine → Work 的新咨询体验；在服务器从数据库读取已确认事实并完成权限校验之前，不得将请求携带的事实或开关视为可信。实际发送与回执仍是独立后续步骤。

## 6. 开发与验收约束

- 按 [PRD.md](PRD.md) 的 P0/P1 顺序做小步交付，一轮只改一个可验证的用户任务。咨询判断契约之后，先落实登录、会话与民宿访问权限，再接入真实资料和 Work 消息；公开示例原型与受保护的正式功能入口区分。改变业务边界时先同步 PRD 与本文；视觉偏离先同步 DESIGN。
- 每个完成的模块验证主流程、加载、空状态、资料不足和接口失败；外部动作特别验证权限、幂等/重复提交、回执与失败恢复。必要的测试应覆盖业务结果而非只复述组件实现。
- 保持 TypeScript 类型与 Pydantic API 契约清楚，业务事实与 UI 文案分离，示例数据集中且始终标记。不要把 `sessionStorage` 当正式数据库，不把浏览器端开关当服务端授权。新增接口时同步更新请求/响应契约与必要的集成验证。
- 页面仍需支持移动端、中英文、键盘与减弱运动设置。正式数据接入前，原型中的虚构订单、评价、需求指数、活动和照片不得展示成实时事实。
- 不使用破坏性 Git 回退作为常规修复手段；每轮先确认修改范围并验证相关功能。部署/公开发布在真实数据、权限和失败处理验收后另行决定。

## 7. 尚待确认的外部条件

消息渠道与预订平台是否开放接口、AI 具体模型及费用上限、市场数据来源与授权、文件解析方案、部署地区和正式环境费用。上述条件不阻碍先完成“民宿资料 → 咨询分类 → 有依据回复/转人工 → 结果记录”的第一条完整功能链。

## 8. 选型依据

- FastAPI 使用 Pydantic 模型定义请求体与验证，适合把首条用户旅程的输入/输出先固定下来：[FastAPI 官方文档](https://fastapi.tiangolo.com/tutorial/body/)。
- Supabase 提供 PostgreSQL 与认证；其 Edge Functions 使用 TypeScript/Deno，因此不能把 Python FastAPI 直接当作 Supabase Edge Function 部署：[数据库连接](https://supabase.com/docs/guides/database/connecting-to-postgres)、[认证](https://supabase.com/docs/guides/auth)、[Edge Functions](https://supabase.com/docs/guides/functions)。
- Vercel 支持 Next.js 部署，Render 提供 FastAPI Web Service 部署指南：[Vercel 文档](https://vercel.com/docs/frameworks/full-stack/nextjs)、[Render 文档](https://render.com/docs/deploy-fastapi)。
- shadcn/ui 官方支持 Tailwind 4 与 React 19；只在需要时采用其可复用组件：[shadcn/ui 文档](https://ui.shadcn.com/docs/tailwind-v4)。

## 本地资料串联（2026-10-20）

正式账号与数据库仍待 Supabase 配置。为独立验证 Mine → Work，本地模式使用 Python 标准库 SQLite，仅保存早餐时段与常规入住时间。两个服务都须显式设置 `HOMESTAY_LOCAL_DATA=1`，并只监听 127.0.0.1；不要在共享/托管部署开启。Next 校验 localhost 主机及写入来源；FastAPI 只接受回环客户端。本模式不是正式鉴权的替代品。

资料默认为空，不自动种入示例。Mine「回复依据」确认保存后写入 `backend/data/local.sqlite3`（Git 忽略）；留空保存删除该依据。服务端校验时间格式、早餐起止顺序，并在事务中更新。Work 新咨询由服务端读取这些已确认资料，不接受浏览器注入事实；缺失资料转人工。其他 Mine 字段、历史消息和例外事务仍为示例。已支持可选模型草稿；实际发送待接入。

API：GET/PUT `/v1/local/facts`；POST `/v1/local/reply-decision`。SQLite schema v1：facts(key PK, value, updated_at)，创建仅在首次使用时执行；后续结构变更须增量迁移，不覆盖现有资料。正式多用户链仍走 Supabase Auth/RLS，待第 3 项完成。

## 可替换模型草稿适配器（2026-10-21）

Work 本机新咨询增加可选模型润色层：先经过现有规则门禁，仅有已确认时间依据的普通问题才调用模型。退款、提前入住、资料不足和未支持的问题不调用。模型输入仅含当前问题、语言及相关引用事实。全部模型草稿为 needs_review / sent=false；格式和时间检查不等于语义正确证明，不能自动发送。

后端环境变量：MODEL_ENABLED（默认关闭）、MODEL_API_KEY、MODEL_BASE_URL、MODEL_NAME。已用虚构咨询验证 DeepSeek 官方 deepseek-flash；通过 https Chat Completions 接口调用。学校接口若兼容，仅替换变量；若不兼容，在 model_service.py 增加适配，不改页面。DeepSeek 的 thinking=disabled 参数只用于其官方域名。单次最多 256 输出 tokens，20 秒超时，不自动重试、不换付费模型，错误详情与密钥不回传前端。失败明确显示规则备用回复与待审核状态。真实账号、自动发送、Analysis 模型接入仍未完成。

### 首页房态前端评审

RoomBoard 组件使用内置示例房间与 React 本地状态，展示固定 9 月 17 日快照；不跟随原日程日期选择变化，不接 API、不保存数据库、不改变 Work 或首页入住率数据。演示清洁仅更新当前组件状态，刷新重置。正式客房/订单联动须另行确认并设计状态约束。

## 本机草稿处理记录

SQLite schema v2 增加 reply_runs：记录内部 ID、UTC 时间、问题、语言以及完整判断结果（草稿、引文快照、engine、reason_code、sent=false）。v1 → v2 为增量建表，不重置 facts。更新民宿资料后，历史引用仍保留生成时版本。记录不包含 API 密钥、供应商原始错误或认证头。GET /v1/local/reply-history 只供回环开发服务读取最近 50 条，本轮不增加用户界面入口。正式账号及数据保留策略仍须在上线前完善。

### SQLite v3 会话适配

v2 → v3 新增 demo_threads、demo_messages、demo_drafts，本地迁移时插入 Jamie/Morgan 两条虚构客人问题。问题与回复独立成行，不修改历史消息；AI 结果存于草稿表和 reply_runs 审计。草稿处理先事务占位，同一会话处理中请求返回已有状态，不重复调用。结果按确认事实快照、语言和自动回复开关摘要复用；已有人回复后不会再自动起草。经营者回复带 request_id UUID，重试同一请求只保存一次，ID 与内容不符返回409。处理超时35秒标记失败，不自动重试付费请求，可人工回复。主界面不显示供应商密钥或原始异常。新增本机接口 conversations/conversation/conversation-draft/conversation-reply 均受既有回环开关约束；正式多用户入口仍待鉴权联调。

### 本机 Analysis 摘要适配与缓存

GET /v1/local/analysis-summary?days=7|28&language=en|zh；示例指标由 analysis_service 计算，市场信号与自身入住率分开。相同输入/语言/模型/地址复用SQLite v4 summary_cache，避免反复进页重复扣费；生成前事务占位，处理中返回标注的规则解释，失败结果缓存五分钟。无后台定时重试，学校兼容接口沿用模型配置。模型正文限制为两段、每段450字符内、不含数字；格式检查并非语义正确性的证明，页面仍为示例解读和建议，任何操作需人工确认。正式订单数据与外部信号未接入。

### 已有推广生成与保存服务

本机 POST /v1/local/promotion-generate 从受控示例context/channel/language与确认时间事实构造输入，复用模型地址/名称/密钥配置；不接受客户端伪造价格或优惠。模型结果要求短正文、无数字/URL，格式检查不代替人工审核。生成按输入缓存，失败缓存五分钟，不后台重试或切换模型。GET/PUT /v1/local/promotion-draft 使用SQLite v5 promotion_drafts保存人工编辑的最新稿，键为线索+渠道+语言。保存只写本机，published始终false。原页面编辑器读取保存结果，未保存的编辑仅留当前页面；未接实时活动、OTA或社交平台发布接口。

### 本机客房与订单快照

下一次增量迁移v5→v6增加demo_rooms和demo_reservations，仅首次迁移插入虚构快照，不覆盖既有事实、消息、草稿。房态由固定演示时点2026-09-17的在住订单与独立清洁状态计算；到店日包含、离店日不包含，confirmed/cancelled/checked_out不算在住。GET /v1/local/room-board读取派生房态、统计与简短订单提示；POST /v1/local/room-clean接收房号，在同一写事务内重新检查在住订单后才设置clean，同一清洁操作重复提交结果一致，在住返回409。没有订单编辑或入住/退房接口。仍受本机模式/回环限制，托管鉴权未完成。公开原型在本机接口明确404时保留前端样本；服务失败不静默回退假数据。Analysis暂不接入本快照，避免将当天房态与多日入住率混用。

### 订单指标计算约定

v6→v7仅追加前缀history-/future-的虚构订单样本，保留现有记录与清洁状态，不新建用户功能入口。GET /v1/local/operation-metrics?days=7|28返回来源、起止日期、逐日已占用/可售间夜、期间汇总、上期差值、工作日/周末占用率、下周预订间夜。固定as_of=2026-09-17，完成日截止前一天。所有指标用同一个SQLite读事务，按房间+日期去重，入住排除confirmed/cancelled，未来预订排除cancelled/checked_out。没有历史预订快照，不推断历史booking pace。Home与Analysis共享前端数据契约与此接口；总结读取同一计算函数，缓存摘要包含完整指标以便订单变化自动失效。旧独立百分比序列只保留作公开静态原型的404回退，不参与本机指标；读取错误不回退。模型仍只解释计算结果，不计算数字或执行操作。

### 本机订单事务契约

v7→v8增加operation_requests（请求、关联订单、虚构付款/规则样本）和operation_decisions（operation_id PK、decision、request_id UNIQUE、fingerprint、advice_json、created_at）。GET /v1/local/operations读取列表与历史方案；POST /operation-advice仅接受id，服务端装配规则依据；POST /operation-decision接受id/decision/fingerprint/request_id，BEGIN IMMEDIATE中重新计算依据并限制可选动作，409拒绝过期或冲突操作，同一request_id相同内容返回原结果。方案与依据快照、UTC保存时间一起记录，external_status恒为not_started。今日空房且已清洁才能建议考虑提前入住；常规时间必须来自确认事实；将来日期的房态未知。不开放订单编辑、退款执行或删除方案接口。Home/Work读取同一列表，sessionStorage仅用于公开原型404回退和非持久化控件。

### 原首页日程适配

GET /v1/local/schedule读取同一订单表，在单一读事务中返回2026-09-14至30日的入住/离店事件，排除cancelled。事件携带订单ID、房号、类型和日期，confirmed未来入住的time可取确认事实，其余time=null，time_basis标注standard_policy或not_recorded。HomeSchedule沿用原日期条/展开样式；回环模式失败不回退假日程，只有404公开原型使用历史样本。不增加schema，不写订单，订单方案记录不会删除日程。
