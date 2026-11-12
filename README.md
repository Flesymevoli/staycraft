# StayCraft

面向民宿经营者的经营分析与决策工作台，将订单、房量、周边市场线索、行动计划和推广草稿连接起来。

## 开发入口

- [项目约定](AGENTS.md)
- [前端与桌面端运行说明](frontend/README.md)
- [Gemini 最终设计源码与演示入口](frontend/public/concept/README.md)
- [数据库迁移与测试说明](supabase/README.md)

当前业务实现位于 `frontend/`，数据库定义位于 `supabase/migrations/`。设计与交互以 Gemini 最终源码及后续确认的调整为准。

## 其他目录

- [backend/](backend/README.md)：可选的旧本地实验服务，不是桌面端启动依赖。
- [video/staycraft-promo/](video/staycraft-promo/README.md)、[video/staycraft-promo-en/](video/staycraft-promo-en/README.md)：独立视频项目及创作资料。
- 本地课程资料：`课程背景.md` 与 `deliverables/`，未纳入 Git 仓库。

[线上 Gemini 演示](https://staycraft.online/try)是静态前端；真实经营流程使用桌面端与独立账号。
