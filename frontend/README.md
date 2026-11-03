> 2026-11-03发布：本次订单导入/分析/行动方案已同步GitHub并发布Cloudflare，4个生产迁移已应用。正式入口https://staycraft.online；下方早期本机交付描述按其记录时间理解。

# StayCraft 当前导入版

2026-11-03：固定CSV订单导入、运营任务、历史/未来分析、AI辅助行动方案和草稿库已在本地实现。公开客人端在新代码中停用。生产迁移及部署未执行，不能将本机验收称为线上已更新。

- `npm ci`：安装锁定依赖。
- `npm run build`：生产构建。
- `npm run sample:imports`：3114虚构隔离演示，关闭真实模型和云端写入；账号见登录页。
- `npm run demo:imports`：生成deliverables/demo-day下的虚构CSV与演示步骤，不修改业务数据。
- `npm run qa:imports`：当前方向的隔离PostgreSQL及浏览器验收，需先构建；使用3174临时端口并自动结束测试服务。
- `npm run release:check`：lint、构建及当前验收。旧scripts/qa-release.cjs包含已退出的客人消息测试，是历史套件，不代表当前发布范围。

测试数据库使用开发依赖PGlite，仅由显式QA脚本加载，正式应用仍使用Supabase PostgreSQL。样本/QA标记在托管环境被拒绝。

模板一单一间、CNY正金额、最长30晚；房型须匹配已有名称，房号可空。支持预览/确认、重复、修改、取消、来源完成状态及未分房；无来源时间的变更须显式确认，旧来源拒绝覆盖。导入不改变人工清洁/实际入住，不会自动改OTA价格。模板没有客人姓名、电话等字段，不需为了导入补造这些资料。

环境：`.env.example`为新环境默认值，不是线上状态。Cloudflare配置中的旧自动回复标记已改0，应用代码固定停用发送；实际线上变量本轮未修改。运营模型调用仍由MODEL_ENABLED与FORMAL_MODEL_ENABLED控制，本机隔离演示固定关闭。不要提交.env、Cookie、.price-monitor或课程资料。

发布与数据库配套说明见 ../docs/IMPORT_RELEASE.md。以下为框架原始说明，不作为业务进度记录。

---

# Staycraft 前端

Next.js App Router / React / TypeScript，Node.js24。npm ci后npm run dev开发；npm run check做lint/类型与生产构建，npm start运行产物。

正式/app使用Supabase公开配置和Auth，一账号一民宿、新账号为空。Work包含关联异常、房态、订单、入住退房、取消审核、消息、自动回复控制和操作记录；Home承接问答与待办；Analysis计算预订金额和已完成订单营业额并给出来源明确的判断。Mine维护资料/房型。Explore推广暂缓。

核心链路在Next服务端运行；FastAPI只是可选草稿服务。正式自动发送与模型开关默认关闭，配置见.env.example。模型仅受限分类/观察排序，真实资料启用仍须授权；外部市场来源未接通。

构建后npm run sample在127.0.0.1:3106运行隔离虚构演示，账号demo@example.invalid/staycraft-demo，重启还原、不接云端或模型。不要把测试开关部署上线。

npx playwright install chromium安装浏览器；npm run release:check执行28项隔离检查。qa-ai-live.cjs是需明确启用的固定虚构资料付费测试，不在默认检查内。旧native/后端专用QA不是正式链路；涉及真实数据库的旧脚本不能自动运行或指向用户民宿。

[部署配置与验收](../docs/DEPLOYMENT.md) · [当前基线](../docs/CURRENT_BASELINE.md) · [当前任务](../TODO.md)
