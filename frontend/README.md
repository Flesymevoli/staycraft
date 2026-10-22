# Staycraft 前端

Next.js App Router、React、TypeScript；Node.js 24。npm ci后运行npm run dev；npm run check执行lint和构建，npm start运行构建后服务。

/app为首页日期日程与客房数量；/app/work为客房概览、添加/详情和预订订单；/app/mine为基本资料和房型维护。Analysis、Explore正式页仍为待接入状态。默认根网址进入/app，未登录转/login。

配置.env.local中的Supabase公开URL/publishable key，并使用已关联民宿账号；上述云端闭环不要求启动FastAPI。工作台生成的/guest?property=...仅作为云端数据入口，不接支付。

本机/native-*仍是独立示例，需要FastAPI的功能按backend/README配置。托管模式关闭旧示例，具体步骤见[DEPLOYMENT](../docs/DEPLOYMENT.md)。

经营端QA脚本使用隔离身份和数据夹具，串行运行以免测试端口冲突。qa-direct-bookings须明确选择专用虚构测试民宿才运行，不能指向用户民宿。
