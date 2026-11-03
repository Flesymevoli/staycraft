# StayCraft

AI Operations Assistant for Small Homestays

StayCraft 面向独立经营少量房源的小型民宿经营者，帮助他们整理已有订单、安排日常工作、理解经营表现，并结合市场参考制定运营行动。

三个核心功能：运营自动化、经营数据分析、AI 经营决策支持。订单以固定 CSV 模板导入为主要来源，竞品价格使用注明来源和时间的参考快照。

2026-11-03 本机交付版已实现订单导入、增量更新、运营任务、分析与行动方案保存，并通过隔离数据库和浏览器验收。公开直订/消息在新代码中停用，生产数据库撤权及新版部署尚未执行，线上仍是旧版。

本机演示：在 frontend 运行 `npm ci`、`npm run build`、`npm run sample:imports`，访问 http://127.0.0.1:3114/login。使用页面标明的虚构演示账号；演示数据在内存中，重启还原。`npm run qa:imports` 执行当前版本的隔离验收。发布步骤见 docs/IMPORT_RELEASE.md。

- 产品需求：[docs/PRD.md](docs/PRD.md)
- 当前规则与实现边界：[docs/CURRENT_BASELINE.md](docs/CURRENT_BASELINE.md)
- 开发计划：[TODO.md](TODO.md)
- 接续入口：[docs/SESSION_HANDOFF.md](docs/SESSION_HANDOFF.md)
