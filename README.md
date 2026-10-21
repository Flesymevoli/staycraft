# Staycraft

面向民宿经营者的 AI 辅助经营应用：客人咨询草稿、订单事务建议、客房状态、经营分析与推广文案。当前可运行版本使用本机虚构数据，保留人工审核，不执行真实发送、退款或平台发布。

当前原型入口是 [`frontend/`](frontend/README.md)：Home、Work、Analysis、Explore、Mine 五页的 Next.js 移动端交互原型。进入 `frontend` 后运行 `npm install`（首次）和 `npm run dev`，打开 http://localhost:3000 。

开发边界以 [`docs/PRD.md`](docs/PRD.md)、[`docs/DESIGN.md`](docs/DESIGN.md) 和 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 为准，开发顺序见 [`TODO.md`](TODO.md)。[`backend/`](backend/README.md) 已接入原有 Work 会话、Analysis 经营总结、Explore 推广文案与首页问 AI。本机 SQLite 保存已确认资料、草稿处理记录、演示消息和推广草稿；可配置 DeepSeek 或兼容的学校 API。当前全部基于虚构示例，未接 OTA、支付或真实消息发送。正式登录代码仍待 Supabase 项目联调。

早期单文件原型、设计试验与旧文档统一放在 [`archive/`](archive/README.md)。`deliverables/` 是课程交付资料，保留原位置。旧版网页可通过当前前端的 `/legacy` 预览。

Git 仓库记录通过验证的代码模块；逐模块测试、提交与回滚步骤见 [`docs/ROLLBACK.md`](docs/ROLLBACK.md)。远程仓库为 [Flesymevoli/staycraft](https://github.com/Flesymevoli/staycraft)（私有）。课程交付件、本机数据库和密钥不纳入代码仓库。


当前进展与待确认事项见 [`docs/DEVELOPMENT_STATUS.md`](docs/DEVELOPMENT_STATUS.md)。本机完整演示须同时启动前端与后端并设置 `HOMESTAY_LOCAL_DATA=1`；默认关闭外部模型，启用配置见 backend/README.md。课程 Softr 交付与代码版开发保持独立，尚未发布。

首页客房概览读取本机虚构订单与客房表，标记清洁完成后刷新保留；房态固定为9月17日演示快照，不会办理入住。首页经营一览、Analysis日图/明细和经营总结统一从订单计算7/28日指标（截止9月16日），未来预订进度也从订单计算；市场信号与评分仍为独立示例。

Work原提前入住/退款卡片和Home日程已统一读取同一订单，方案保存后刷新保留，Home待办同步。保存前重新核对依据，房态或规则变化须重新查看；重置演示不会删除已保存方案。Work经营洞察也复用同一指标，不再使用旧独立百分比。不执行退款、入住或真实发送。
