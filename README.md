# Homestay AI assistant

当前原型入口是 [`frontend/`](frontend/README.md)：Home、Work、Analysis、Explore、Mine 五页的 Next.js 移动端交互原型。进入 `frontend` 后运行 `npm install`（首次）和 `npm run dev`，打开 http://localhost:3000 。

开发边界以 [`docs/PRD.md`](docs/PRD.md)、[`docs/DESIGN.md`](docs/DESIGN.md) 和 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 为准，开发顺序见 [`TODO.md`](TODO.md)。[`backend/`](backend/README.md) 已接入原有 Work 会话、Analysis 经营总结、Explore 推广文案与首页问 AI。本机 SQLite 保存已确认资料、草稿处理记录、演示消息和推广草稿；可配置 DeepSeek 或兼容的学校 API。当前全部基于虚构示例，未接 OTA、支付或真实消息发送。正式登录代码仍待 Supabase 项目联调。

早期单文件原型、设计试验与旧文档统一放在 [`archive/`](archive/README.md)。`deliverables/` 是课程交付资料，保留原位置。旧版网页可通过当前前端的 `/legacy` 预览。

本地 Git 仓库记录通过验证的代码模块；逐模块测试、提交与回滚步骤见 [`docs/ROLLBACK.md`](docs/ROLLBACK.md)。课程交付件不纳入代码仓库，当前尚未配置远程仓库。


当前进展与待确认事项见 [`docs/DEVELOPMENT_STATUS.md`](docs/DEVELOPMENT_STATUS.md)。本机完整演示须同时启动前端与后端并设置 `HOMESTAY_LOCAL_DATA=1`；默认关闭外部模型，启用配置见 backend/README.md。课程 Softr 交付与代码版开发保持独立，尚未发布。

首页客房概览已读取本机虚构订单与客房表，标记清洁完成后刷新保留；房态固定为9月17日演示快照，不会办理入住。Analysis多日指标仍使用单独的示例序列，下一步才统一订单口径。
