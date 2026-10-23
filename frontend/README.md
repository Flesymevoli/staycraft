# Staycraft 前端

Next.js App Router / React / TypeScript，Node.js 24。`npm ci`后`npm run dev`本机开发；`npm run check`做lint和生产构建，`npm start`运行构建。

正式入口/app需Supabase公开URL/publishable key和Auth账号。一账号一民宿，首次登录为空容器。Work管理房态、订单、入住退房、取消审核和站内消息；Mine维护资料与房型；Analysis提供自身预订分析。营业额仅本机演示，Explore来源与首页AI尚未接通。

构建后`npm run sample`在127.0.0.1:3106运行隔离虚构演示，重启还原。不要在线上启用测试开关。

安装浏览器`npx playwright install chromium`后，`npm run release:check`运行可复现发布检查。旧native/后端专用QA不全部属于发布检查；`qa-direct-bookings`涉及真实数据库，不能自动运行或指向用户民宿。

[部署配置与实际环境验收](../docs/DEPLOYMENT.md)。
