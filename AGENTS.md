# 项目工作约定

继续开发或切换模型时，先读 TODO.md、docs/CURRENT_BASELINE.md；UI任务再读 docs/UI_PARITY_AUDIT.md。最新用户要求优先。PRD/DESIGN/ARCHITECTURE保留历史阶段说明，冲突时以当前基线为准；DEVELOPMENT_STATUS是历史验证日志，不是当前待办。

一次完成并测试一个模块，记录实际验证范围和回滚点。不新增未授权功能。接正式数据时逐项核对原型结构与交互，不能另写简版页面后把原功能默认为删除。没有来源时标明未完成；演示数据必须隔离。改变范围同步当前基线与TODO。

经营端优先，客人端只作预订/消息来源。课程文件与产品开发分开；无OTA、无真实收付款。一个账号对应一个民宿。未经新授权不启用正式模型真实资料调用或公开部署。

保留用户的未跟踪文件，不把未审查的operator-desktop.css、scripts/、tmp/自动加入提交。各子目录AGENTS.md仍适用。
