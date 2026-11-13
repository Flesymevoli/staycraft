# StayCraft 接续交接

更新：2026-11-13（Asia/Shanghai）。状态总览见 [任务清单](CURRENT_BASELINE.md)。本文件记录当前事实和接续顺序，不扩大 [AGENTS.md](../AGENTS.md) 中的授权范围。

## 用户已确认的方向

- UI 继续使用 Gemini 实际源码、当前品牌及紫色底图标；线上 Gemini 静态演示与桌面应用分开。
- 经营以订单导入为基础，不做 PMS，移除清洁功能；房态和业务事实必须真实，文案风格不再作为当前优化重点。
- 导入表格时自动增加新房型，确认前先预览；没有的基础资料不编造。
- 携程筛选放在 StayCraft，只保留城市、入住日期、星级，默认民宿；城市不能限制为几个预置项。不再让用户逐家输入详情页或复制搜索链接。
- 复用官方登录状态，仅采集搜索列表，逐日读取前五家。列表展示起价仍保留独立口径，不直接计入日历参考价中位数和调价依据。
- 工作流程：Codex 在 Dev 修复并自动／实操验收 → 构建生产配置 Preview → 用户体验 → 通过后制作 Windows Beta 并测试真实安装。不要把基础测试反复交给用户。

## 当前环境与启动

命令在 `frontend/` 执行：

- `npm run desktop:dev`：本地开发与热更新，使用当前环境的数据服务。
- `npm run desktop:runtime:build` 后 `npm run desktop:standalone`：正式资源构建的 Preview。此次构建已完成，`.desktop-runtime/current.json` 指向当前资源，勿在文档硬编码临时 build 目录名。
- `npm run desktop:try`：独立的虚构数据开发试用入口，不是生产配置 Preview，也不能代替真实账号验收。
- `npm run desktop:hosted`：已部署的线上工作台，不代表本地最新源码，不用于此次 Preview 验收。

本机已有专用桌面测试资料目录及 test1 登录会话。优先复用合法的现有会话；不要输出或复制 Cookie、令牌、密钥，不把它们放入交接或 Git。

## 导入已通过的实际验收

用户已授权应用自动新增房型迁移，并仅用 test1 导入虚构订单。已从实际独立桌面界面完成预览和确认：

- 渠道 `QA-AUTO-IMPORT`；订单号 `QA-20261113-1`、`QA-20261113-2`。
- 房型 `验收房型（虚构）`，仅创建一次；基础房价、入住人数为 NULL，床型为待补充。
- 第二条订单原始房号 `QA201` 保留在快照，未创建客房；此测试民宿仍为 0 间客房。
- 重启后重新读取、重复预览、打开编辑及空字段显示通过；没有执行补填后保存。
- 验收记录保留在测试账号，未删除或改动真实经营订单。

可复用的真实测试脚本是 `scripts/qa-preview-regression.cjs`。`--commit-auto-test` **可能写线上测试账号**；无该参数的旧诊断分支会访问活动接口，**可能触发真实搜索**。不能把它作为无副作用的默认回归随手运行，必须先核对账号、当前授权和调用范围。

本地截图在被忽略的 `frontend/qa-preview-auto-room-type.png`、`qa-preview-import.png`；截图未进 Git，可用上述脚本重建。

## 数据库差异：继续前先处理

2026-11-13 已只读核实：

| 迁移 | 本地文件 | 线上状态 |
| --- | --- | --- |
| 自动新增房型 | `supabase/migrations/20261113040439_auto_import_room_types.sql` | 已应用；MCP 记录版本为 `20261113041422`，名称 `auto_import_room_types`；price/capacity 已允许 NULL |
| 移除清洁字段 | `supabase/migrations/20261112093409_remove_housekeeping.sql` | 尚未应用；线上 `rooms.housekeeping` 仍存在 |

不要直接 `db push --include-all`，也不要为了消除版本差异重复执行线上 SQL。先核对迁移历史与当前函数定义，再准备版本对齐。尤其是待应用的清洁迁移包含旧版 `valid_property_inventory`（要求价格、人数非空），若直接在当前线上执行，会覆盖新的空值支持；必须先保证最终校验函数仍兼容导入房型。

下一次库存验收还需检查线上 `private.save_room_inventory` 与当前无清洁字段的前端提交是否兼容，并覆盖补填保存／刷新。此次只确认了导入事务和读取，没有证明整个库存编辑写入链路已通过。

## 活动接续

此前实际 Preview 的活动返回空结果及通用搜索失败说明。发现短地址没有“市／州”等后缀时，搜索区域提取失败。当前代码从高德地理编码结果获取省、市、区，供活动搜索使用；响应绑定仍保留用户原地址，防止地址范围串用。

改动入口：`desktop-api/worker.ts`、`src/lib/amap-nearby.ts`，以及 `scripts/qa-desktop-signals-worker.cjs` 的短地址测试；推广页增加“重新读取线索”。本地 774 项断言通过，**尚未将这次 Worker 修复发布**。

接续应先按当前授权边界确认独立 Worker 发布和真实搜索次数，再用不同城市地址验证。目标是 `desktop-api/wrangler.jsonc` 的 `staycraft-desktop-signals`，不要发布主站或 Gemini demo。不能把 HTTP 200 + 空活动列表自动判为搜索成功。

## 携程接续

- `desktop/collector-runner.cjs` 在脚本完成后显式退出 Electron utility process，修正完成后界面仍持续等待的问题。
- `scripts/price-monitor-browser.mjs` 在 Windows 优先使用安装的 Edge，并使用单独的 `browser-profile-edge` 目录；其他情况回退 Playwright Chromium。登录和列表采集使用同一 helper。
- 此调整缘于打包资源中的 Chromium 曾遇到 ProcessSingleton／目录锁失败；目前只在隔离目录验证了窗口启动和正常退出。
- Edge 的专用登录目录不同于原 Chromium 目录，不应假设旧登录状态自动迁移；不得复制 Cookie。官方登录如需用户认证，只让用户完成认证，后续筛选、采集和同步由 Codex 测试。
- 城市改为自由输入，采集脚本通过携程目的地选择器实际选城市，再点击民宿／星级与日期控件。该城市选择器仍待真实网站验证。
- 优先核对 `selectCity` 改完城市后，`checkFilters` 比对的城市基准是否同步更新；当前无 cityId 的输入会先以 cityId=1 启动，不能让后续校验仍拿初始城市与目标城市比较。
- 继续验证七天逐日刷新、筛选不丢失、每天前五家、遇验证或限流明确停止、成功同步到正确账号；本地调度测试和空白页启动测试不能替代这一链路。

## 测试与交付边界

已通过项目见任务清单，无需无差别重跑全部测试。`qa-import-journey.cjs --import-only` 是此次导入专用测试；不带参数时旧推广测试在“使用模板”定位处失败，需要按当前 UI 修订并完成推广回归。

本次 Git 保存不触发推送、Worker 发布、数据库清洁迁移、真实搜索／模型调用或安装包生成。后续仍依当前具体授权执行；未通过的事项保留在任务清单，不能宣称已完整交付。
