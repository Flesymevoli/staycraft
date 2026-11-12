# 工程参考地图

> 路径相对仓库根目录；命令在 frontend/ 执行。按任务需要查阅，记录可能滞后，使用前核对代码。保留正确业务算法和功能，组件及实现结构可自主调整；不要求维护本文件或其他状态文档。

## 历史模块方案参考

> 以下为历史模块方案与验证参考，不规定开发顺序、代理分工或固定测试清单。是否实施以当前任务为准。

### A. 市场快照与七日明细（历史方案）
- 携程采集优先使用同一个搜索结果页，仅切换入住和离店日期。读取可见列表起价，单独保存为 `display_starting_price`，记录人数、入住日、采集时间和可见优惠标签。该口径不进入现有日历参考价统计。遇到登录、验证码或访问限制停止。
- 本地命令：`node scripts/collect-ctrip-list-prices.mjs "<携程搜索结果页 URL>" "<新建的输出 JSON 路径>"`。桌面现有按钮仍使用房源日历，接入列表数据前需要更新桌面输入、同步数据类型及市场页来源标识。
- 页面职责：顶部简洁展示覆盖地点、半径、实际民宿数、实际有效报价数、入住日期范围、采集时间；下方铺开逐店逐日价格。PC表格，手机仅表格区域可横滑，页面本身不横溢。日期/店名清楚，详细条件与来源可查看。
- 未来七天默认按Asia/Shanghai明天起连续七个入住日，每晚独立，离店=次日；日期规则通过单测固定，历史试验的第4/第7天两日期不能继续冒充七日覆盖。
- 候选按中心坐标、15km、住宿类型过滤并去重；缺坐标不声称在范围内。记录候选来源及覆盖不足；不把搜索总数、观察记录条数当作独立民宿数。
- 数据保留稳定酒店标识、来源URL、采集时间、入住/离店、人数/间数、币种、价格类型、登录/会员价格口径（仅标签，不存会话密钥）、房型/早饭/退改/税费已知条件。缺值保留unknown/null，缺价不是0，查询失败不是售罄。
- CSV正确处理逗号、引号、换行；重复导入幂等；坏行有可定位错误，不悄悄吞整批；日期/数值/币种/归属校验在服务端，用户不能指定另一个民宿作用域。
- 开页/切日期/刷新读取已导入快照，不触发RollingGo或浏览器采集；移除旧MarketPrices挂载不等于所有旧请求已消失，需网络断言。无快照显示空态，演示明确标虚构；不得把杭州试验挂作太仓周边真实数据。
- 涨跌比较键至少包括酒店、入住日、晚数、人数/间数、币种及可用报价条件/身份口径；历史条件不明时不画涨跌。跨入住日期仅展示日期间价差，不称趋势。批次写失败不能返回“已保存/database”。
- 范围/分位数沿用有效样本口径；不足3家不下总体区间结论；日历价不宣称同档最终可比价；引用当时证据，不替换历史报告快照。

必测情景：空快照；完整七日；部分酒店/日期缺价；重复酒店/重复导入；同日期真实历史涨跌；只有不同入住日而无历史；不同人数/币种/会员口径不比较；超15km/缺坐标；存储失败；用户A不能读写用户B。使用明确模拟fixture，不写生产记录。至少断言刷新/日期切换没有MCP调用。

### B. 经营诊断与行动一致性（历史方案）
- 规则计算只产出事实/线索，真实Agent根据问题调查；首页优先经营判断和1–2项决策，不机械只看空房。
- 报告、首页与计划从同一诊断结果关联；不以opportunities[0]替代报告优先建议。引用市场的入住日、来源、采集时间和口径，失败保留内部收入分析。
- 无可比历史仍分析本期收入构成与未来预订；金额/间夜/成交均价代码计算，成交均价不叫挂牌价；未来已订占用率不与历史最终占用率当同提前期趋势。
- 回归至少覆盖收入下降但间夜增加、无历史、市场失败/不足、报告重试复用证据、摘要与报告一致、选定建议进入计划后不丢日期与依据。真实模型成功须记录runId和调用记录，Mock不能冒充。

### C. 推广与活动（保留已通过部分）
- 标题“最近活动”，留推广页；日期相交、15km、来源/采集时间、默认3条/展开全部；POI不是近期活动，地图失败仍保留可用活动。
- 新素材采用仅表示保存参考，未重新计算的客群/文案不得假称已融合。需要联动时明确使用的诊断、日期、素材快照，历史草稿不静默改写。
- 文案库简约版/引流版，生成/换一换、编辑/保存保留，不擅自恢复整套模型文案生成。

## 正式实现路径

| 责任 | 主要代码 |
|---|---|
| 导航/页面容器 | frontend/src/components/workbench-shell.tsx |
| 首页诊断 | workbench-dashboard.tsx、diagnosis-overview.tsx、workbench-report.tsx（同components目录） |
| 全文与证据 | frontend/src/components/diagnostic-article.tsx、diagnostic-article.css |
| 经营数据 | frontend/src/components/business-data-workspace.tsx |
| 市场 | frontend/src/components/workspace-explore.tsx、market-overview.tsx |
| 推广 | frontend/src/components/promotion-workspace.tsx；frontend/src/lib/promotion-library.ts |
| AI接口 | frontend/src/app/api/workspace/agent/route.ts |
| 调查 | frontend/src/lib/decision-agent.ts、decision-agent-types.ts |
| 收入证据 | frontend/src/lib/agent-revenue.ts |
| 写作/复核 | frontend/src/lib/agent-report-writer.ts |
| 持久化/缓存查询 | frontend/src/lib/decision-agent-store.ts |
| 模型服务 | frontend/src/lib/model-provider.ts |
| 外部报价 | frontend/src/lib/market-tool.ts（RollingGo） |
| 周边活动与天气 | frontend/src/app/api/workspace/discovery/route.ts；frontend/src/lib/signals/events.ts、amap-nearby.ts；frontend/src/components/nearby-discovery.tsx、nearby-discovery.css |
| 新增信号/机会/行动 | frontend/src/lib/signals/、frontend/src/lib/decisions/；frontend/src/app/api/workspace/agent/plan/route.ts |
| 采集快照基础 | frontend/src/lib/market/{ctrip,import,sample}.ts；frontend/scripts/export-ctrip-quotes.mjs（本地脚本，不由网页运行） |
| 用户/民宿权限 | frontend/src/lib/workspace-access.ts |
| 隔离样本 | frontend/scripts/qa-workspace-fixture.cjs、operator-sample-data.cjs |
| 样式 | frontend/src/components/workbench.css、workbench-surfaces.css、workbench-motion.css |

## 数据与报告流程

认证并取得民宿作用域 → 内部资料/指标 → 现有Agent工具循环 → 必要的一次市场补查 → 保存investigated及快照 → 写作阶段请求 → 结构/事实校验 → 模型语义复核 → complete或writing_failed → 首页引用同一报告。

用户只写作重试时复用runId及快照，不重新查询外部。状态可能同时为phase complete和status limited（某项调查失败）；不得把这解释成“全链路成功”。原接口存在运行中任务与缓存复用，不能为新展示绕过它们。

工具包括get_revenue/get_metrics/get_bookings/get_inventory/query_market。订单导入与收入使用现有金额/日期/状态口径，修改前读实现与测试。使用Supabase相关技能后再改数据库/RLS，不在此文档中复制密钥。

当前尚有逻辑断点：detectAll/buildOpportunities在模型调查之后运行，保存行动计划默认取opportunities[0]。不得把这些模块存在描述成“信号驱动调查、同一报告建议贯穿行动”已完成。后续按三个能力/五页原定位整合。

周边活动：discovery只返回活动及来源，中心/15km/日期在服务端筛选，无可靠中心不返回周边事件。property-location仅给已认证配置演示账号使用虚构地址固定中心，真实账号仍地理编码。nearby只提供民宿天气，日期范围过滤，失败不保留旧值。不要在正常刷新时重新采集官方源。

## 验证选择

针对诊断本轮：qa-decision-agent.cjs、qa-agent-report.cjs、qa-diagnosis-overview.cjs、定向ESLint、npm run build及真实浏览器布局检查。需要收入变动时增加qa-agent-revenue.cjs（运行前核对文件存在及适用范围）。只有文档变更检查路径/规则/差异，无须构建、初始化数据或调用模型。

真实模型/供应商测试不在默认模拟测试中。真实验证要沿用服务端配置、明确数据范围、保留runId/来源/失败原因，不能反复调用来凑成功记录。UI回放不能冒充真实生成。

周边隔离回归：node scripts/qa-discovery-events.cjs、node scripts/qa-signals.cjs、node scripts/qa-amap-address.cjs。旧qa-amap-nearby.cjs会调用真实高德；旧qa-demo-e2e.cjs会删除样本历史并启用地图，不能未经检查直接运行。测试时保留tmp内已有成果。

## 当前部署与密钥

Cloudflare/OpenNext脚本：frontend/scripts/cloudflare.cjs；现有npm cf:*命令。历史发布结果见 SESSION_HANDOFF，不构成当前发布授权。Vercel为历史路径。
.env.local/.dev.vars等私有文件仅本机/运行环境使用；交接只传变量名和配置说明，不传值、Cookie或访问令牌。

## Git与可移植交接

指定当前文档已从.gitignore排除规则中单独放行，但尚未提交。换同一工作区可见；只克隆GitHub则看不到本地未提交代码/文档。
核心本地新文件diagnosis-overview.tsx、qa-diagnosis-overview.cjs必须在未来审查提交时与现有修改一起保留，否则克隆后会缺模块。
docs/history、tmp、artifacts、video、用户脚本及operator-desktop.css不是交接提交清单。不得git add .、reset、stash、clean或自动清理。
历史参考不保证跨机器存在；当前核心文档不依赖它们才能启动。截图与临时服务器只作历史证据，不保证可迁移或仍运行。

## 演示同步工具参考
frontend/scripts/sync-hosted-demo.cjs --preview|--commit --property UUID --anchor YYYY-MM-DD：仅配置演示账号和明确虚构民宿，预览保存私有计划，commit严格比较订单/报价/目标profile哈希，正式RPC校验revision。不能作为一般生产初始化工具。2026-11-11已同步成功，不要无故重跑。market_quote_batches迁移已执行，competitor_watches未执行。

## 城市活动维护
在 frontend/src/lib/signals/event-catalog.ts 按城市维护已核实活动。关键词组合用城市/区县、活动类型、日期发现候选，打开官方详情核对展期、场馆、取消和闭馆提示，再以 GCJ-02 坐标、原始链接和核实时间入目录。苏州采集脚本输出待核实候选，不能直接发布。推广与经营信号共用日期及15公里过滤。同城数据共享，查询不触发搜索；当前更新后需重新构建。运行 qa-signals.cjs、qa-discovery-events.cjs 验证跨城和日期边界。

## 桌面端报价同步
采集前 GET /api/workspace/market/sync 获取当前 userId/propertyId。待同步批次保存这两个标识和原始采集时间；用户点击采集并同步后同源 POST，包含 userId、propertyId、start、end、observations。服务端拒绝身份变更，复用 Ctrip 日历价校验、现有市场批次唯一键和 RLS。201 为新批次，200 为相同批次重试，409 为账号切换或同键内容冲突。保留本机批次供重试。模型、浏览器状态和登录凭证不参与。公开演示账号禁止走同步接口；复用现有快照表，无新迁移。node scripts/qa-market-desktop-sync.cjs 在 PGlite 验证。

Windows开发：frontend 下 npm run desktop:sample 打开隔离桌面演示；npm run desktop:dev 用当前 Supabase 配置登录经营账号。前者用固定虚构报价，后者通过 Playwright 采集用户输入的最多5家住宿、明日起连续7晚。两者共用工作台及 Next.js 热更新，独立 Electron 用户数据目录。Electron 主进程用当前窗口会话在发起/提交两处校验账号，并把待同步批次保留在用户数据目录。真实采集需安装 Playwright Chromium，遇登录、验证码和限制暂停。在线版路径、生产配置及数据未调整。
