# Staycraft 前端

Next.js App Router / React / TypeScript，Node.js24。npm ci后npm run dev开发；npm run check做lint/类型与生产构建，npm start运行产物。

正式/app使用Supabase公开配置和Auth，一账号一民宿、新账号为空。Work包含关联异常、房态、订单、入住退房、取消审核、消息、自动回复控制和操作记录；Home承接问答与待办；Analysis计算预订金额和已完成订单营业额并给出来源明确的判断。Mine维护资料/房型。Explore推广暂缓。

核心链路在Next服务端运行；FastAPI只是可选草稿服务。正式自动发送与模型开关默认关闭，配置见.env.example。模型仅受限分类/观察排序，真实资料启用仍须授权；外部市场来源未接通。

构建后npm run sample在127.0.0.1:3106运行隔离虚构演示，账号demo@example.invalid/staycraft-demo，重启还原、不接云端或模型。不要把测试开关部署上线。

npx playwright install chromium安装浏览器；npm run release:check执行27项隔离检查。qa-ai-live.cjs是需明确启用的固定虚构资料付费测试，不在默认检查内。旧native/后端专用QA不是正式链路；涉及真实数据库的旧脚本不能自动运行或指向用户民宿。

[部署配置与验收](../docs/DEPLOYMENT.md) · [当前基线](../docs/CURRENT_BASELINE.md) · [当前任务](../TODO.md)
