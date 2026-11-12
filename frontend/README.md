# StayCraft 前端

业务介绍见[根 README](../README.md)。按任务需要查阅[历史交接](../docs/SESSION_HANDOFF.md)和[设计参考](../docs/UI_GUIDELINES.md)；设计以用户最终确认的 Gemini 前端及后续配色调整为准。

Next.js 16.4.2 / React 19 / TypeScript / Node.js 24。使用npm与package-lock.json，不混用包管理器。开发前读frontend/AGENTS.md及node_modules/next/dist/docs/对应本机版本说明。

## 命令（在本目录运行）

| 命令 | 用途与边界 |
|---|---|
| npm ci | 从锁文件安装；已有环境无需每轮重装 |
| npm run dev -- --hostname 127.0.0.1 --port 3117 | 开发服务；本身不隔离数据库，读取私有环境配置，不能当测试沙箱 |
| npm run build | Next生产构建及TypeScript |
| npm run lint | 全src静态检查 |
| npm run sample | 构建后启动3106隔离虚构样本；模型关闭 |
| npm run sample:imports | 构建后3114丰富导入样本；允许高德只读请求，不是完全离线 |
| node scripts/qa-decision-agent.cjs | Agent循环/证据/缓存/市场查询隔离测试 |
| node scripts/qa-agent-report.cjs | 报告写作/校验/失败重试隔离测试 |
| node scripts/qa-diagnosis-overview.cjs | 首页报告概览渲染测试 |
| npm run qa:imports | 导入/PGlite/浏览器较广回归，先构建；不要误说本轮已执行 |
| npm run cf:build | Cloudflare OpenNext构建，不部署 |
| npm run cf:deploy | 正式部署，会改线上；不是普通测试命令 |

本机样本账号：demo@example.invalid / staycraft-demo（仅本机假凭据）。默认样本无真实AI报告；历史回放、模拟模型、真实模型生成必须分别说明。

环境变量名称与默认值见.env.example；不要输出.env.local内容。不能把环境示例当生产配置。测试标记不能部署；生产经营表不能作为测试夹具。

Windows若子进程spawn EPERM，按执行工具审批机制处理；不要通过切换shell绕过文件权限或删除构建目录解决。预览端口需要检查是否仍存活，不沿用旧进程号。

旧文档原文在本地docs/history/pre-handoff-2026-11-10/frontend__README.md，不随Git。

## Windows 桌面开发版

运行 npm run desktop:sample 体验本地隔离流程。demo@example.invalid 和 desktop-b@example.invalid 是隔离账号，密码均为 staycraft-demo。打开市场调研，输入一行 https://hotels.ctrip.com/hotels/123456.html 虚构民宿，点击采集并同步。报价为虚构，重启后隔离工作区数据还原。

配置 .env.local 并运行 npx playwright install chromium 后，可运行 npm run desktop:dev 用自己的 StayCraft 经营账号操作。需要携程会话时在采集面板打开携程登录，结束后关闭登录窗口。每行填真实住宿链接和页面完整名称，最多 5 家。确认同步后数据写入当前连接的 Supabase 工作区。开发窗口复用 Next.js，页面支持热更新。

本地回归：node desktop/qa-desktop.cjs（3190 需空闲），node scripts/qa-market-desktop-sync.cjs。

### Desktop Beta 工作台入口

在 frontend 目录运行 `npm run desktop:hosted`，Electron 直接打开 `https://staycraft.online`，使用线上已部署的工作台。验证当前工作区的后端和页面改动需使用本地开发服务或配套的验收部署。正式采集输入携程住宿搜索列表链接，按入住日采集并同步列表起价。安装包验收需将 Playwright Chromium 放到资源目录的 `playwright-browsers` 下。
