# Homestay AI assistant

当前原型入口是 [`frontend/`](frontend/README.md)：Home、Work、Analysis、Explore、Mine 五页的 Next.js 移动端交互原型。进入 `frontend` 后运行 `npm install`（首次）和 `npm run dev`，打开 http://localhost:3000 。

开发边界以 [`docs/PRD.md`](docs/PRD.md)、[`docs/DESIGN.md`](docs/DESIGN.md) 和 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 为准，开发顺序见 [`TODO.md`](TODO.md)。[`backend/`](backend/README.md) 已有第一版 FastAPI 咨询判断接口，暂未接入页面。原型使用虚构示例数据和浏览器会话状态，没有真实 AI、预订平台或支付接入。

早期单文件原型、设计试验与旧文档统一放在 [`archive/`](archive/README.md)。`deliverables/` 是课程交付资料，保留原位置。旧版网页可通过当前前端的 `/legacy` 预览。

本地 Git 仓库记录通过验证的代码模块；逐模块测试、提交与回滚步骤见 [`docs/ROLLBACK.md`](docs/ROLLBACK.md)。课程交付件不纳入代码仓库，当前尚未配置远程仓库。
