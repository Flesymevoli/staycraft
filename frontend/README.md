# StayCraft 运行说明

项目约定见 [AGENTS.md](../AGENTS.md)。当前依赖版本以 [package.json](package.json) 和 `package-lock.json` 为准：Node.js 24.x、npm、Next.js 16、React 19。修改 Next.js 代码时参照[本目录约定](AGENTS.md)和本机 `node_modules/next/dist/docs/` 对应说明。

## 设计与代码入口

- UI 验收基准：[Gemini 实际源码与运行方式](public/concept/README.md)，包含最终配色。旧 `public/prototype.html` 不是当前设计基准。
- 页面与接口：[src/app/](src/app/)；业务逻辑：[src/lib/](src/lib/)；组件：[src/components/](src/components/)。
- 桌面主进程与本地服务：[desktop/](desktop/)；独立天气／活动与 AI 接口：[desktop-api/worker.ts](desktop-api/worker.ts)。
- 账号与数据库：[Supabase 说明](../supabase/README.md)。

以下命令均在 `frontend/` 执行。已有依赖无需每轮重装。

## 桌面端开发与独立运行

首次准备：

```sh
npm ci
npx playwright install chromium
```

参照 [.env.example](.env.example)在私有配置中设置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`；`DEMO_LOGIN_EMAIL` 可选，用于识别只读演示账号。不要输出私有配置文件内容。

| 命令 | 用途 |
| --- | --- |
| `npm run desktop:dev` | 启动本地 Next.js 开发服务（127.0.0.1:3190）和桌面窗口，支持热更新；使用当前环境连接的数据服务 |
| `npm run desktop:runtime:build` | 从当前源码构建独立运行资源，放在被忽略的 `.desktop-runtime/`；不是安装包 |
| `npm run desktop:standalone` | 启动已构建资源，由 Electron 启动本地生产服务，不要求另开开发服务器 |
| `npm run desktop:sample` | 本地内存隔离样本，虚构账号、订单和采集报价；不是 Gemini 静态 demo |

独立构建只提取上述公开配置，不复制 `.env`、地图或模型私钥。可用 `npm run desktop:runtime:build -- --config <公开配置JSON路径>` 显式选择公开配置。修改源码后需重新构建，独立运行窗口才会使用新代码。

`desktop:dev` 使用本机服务端配置，天气和按民宿地址筛选活动仍需私有 `AMAP_MAPS_API_KEY`（当前 `.env.example` 未列出此项）。独立运行版使用已发布的数据接口，不读取或携带该密钥。

独立桌面端默认通过 `https://staycraft.online/desktop-api/v1/signals` 读取天气与活动，接口按登录账号、民宿、地址和日期验证。活动包括已核实的[日历记录](src/lib/signals/event-catalog.ts)，以及中国美术馆、浙江美术馆的[官方日历更新](src/lib/signals/official-events.ts)；官方日历仅覆盖场馆周边 15 公里，不是任意城市的实时活动搜索。

公开配置需与独立接口连接同一个 Supabase 项目；更换本地配置不会自动切换服务端项目。

采集面板支持携程住宿链接与完整名称（最多 5 家），或搜索列表链接。需要登录时在面板打开携程登录窗口，完成后关闭；采集结果经保存写入当前账号的市场数据。日历参考价与列表起价是不同口径，保留原始日期和来源条件。

开发服务和独立桌面端都不会自动隔离所连接的数据库。演练使用明确的测试账号和虚构数据；不要导入真实经营账号。独立桌面端通过 `/desktop-api/v1/ai` 调用服务端模型，接口验证账号与民宿归属；模型私钥不进入桌面资源。接口已接通，但真实模型的文案质量与完整报告验收尚未通过，规则生成与真实 AI 结果须分别标识。

`npm run desktop:hosted` 仅打开已部署的线上工作台，不反映当前本地源码；它不是独立桌面端验收入口。安装包与下载地址须在最终交付时另行准备。

## Web 开发与隔离样本

| 命令 | 用途 |
| --- | --- |
| `npm run dev -- --hostname 127.0.0.1 --port 3117` | Web 开发服务，读取私有环境配置 |
| `npm run build` / `npm start` | Next.js 生产构建／运行构建产物 |
| `npm run sample` | 构建后启动 3106 内存隔离样本，模型关闭 |
| `npm run sample:imports` | 构建后启动 3114 导入样本，允许高德只读请求，模型关闭 |

样本凭据为 `demo@example.invalid` / `staycraft-demo`（仅本地假凭据）。样本经营数据保存在内存，进程重启后还原；测试开关不得用于线上部署。CSV 生成与使用见 [scripts/demo-data/README.md](scripts/demo-data/README.md)。

## 按改动选择验证

| 命令 | 验证范围 |
| --- | --- |
| `npm run lint`、`npx tsc --noEmit` | 静态检查与类型检查 |
| `node scripts/qa-desktop-search.cjs` | 订单、房型与功能搜索 |
| `npm run qa:desktop-runtime` | 本地运行服务与配置隔离 |
| `npm run qa:desktop-runtime:electron` | Electron 运行资源验收；先准备独立资源 |
| `node scripts/qa-desktop-external-signals.cjs` | 桌面端天气／活动读取与范围验证，模拟网络 |
| `node scripts/qa-desktop-signals-worker.cjs` | 独立接口鉴权、只读边界和响应验证，模拟网络 |
| `node scripts/qa-desktop-signal-integration.cjs` | 天气、活动与业务入口接入，隔离数据 |
| `node scripts/qa-decision-agent.cjs`、`node scripts/qa-action-plan.cjs` | 诊断证据与行动计划 |
| `node scripts/qa-promotion-writing.cjs` | 文案结构与事实校验，不调用真实模型 |
| `npm run qa:imports` | 构建后的导入、数据库夹具与浏览器回归 |

这些命令是可选入口，不是每轮必跑清单。浏览器或 Electron 验收应区分模拟数据和真实接口；真实模型测试需当前授权及明确次数上限。

## Cloudflare 发布边界

发布命令均会影响线上，只有当前任务明确授权时才执行。桌面开发、独立资源构建和文档修改无需发布主站。

| 目标 | 配置与入口 |
| --- | --- |
| Web 主站及 Gemini 静态 demo | [wrangler.jsonc](wrangler.jsonc)、[concept-worker.mjs](concept-worker.mjs)；`npm run cf:build` 构建，`npm run cf:deploy` 发布 |
| 独立天气／活动与 AI 接口 | [desktop-api/wrangler.jsonc](desktop-api/wrangler.jsonc)；Worker `staycraft-desktop-signals`，路由仅 `staycraft.online/desktop-api/*`，不含前端资源 |

独立接口需要服务端 `AMAP_MAPS_API_KEY`，Supabase 公开配置由其 Wrangler 配置提供。AI 由 `AI_ENABLED` 控制，模型配置见 [ai.ts](desktop-api/ai.ts) 的 `AiEnv`；课程模型需服务端 `MODEL_BASE_URL`、`MODEL_API_KEY`、`MODEL_NAME`，官方接口使用 `DEEPSEEK_API_KEY`。接口不写入业务数据。指定配置运行 `npx wrangler dev --config desktop-api/wrangler.jsonc --local` 可作本地预览，私钥从仓库外私有文件通过 `--env-file` 提供。

独立接口的构建检查使用 `npx wrangler deploy --config desktop-api/wrangler.jsonc --dry-run`；发布时同样必须明确指定该配置。私钥通过服务端 secret 配置或仓库外的 `--secrets-file` 提供，不能写入源码或打进桌面资源。主站发布前须运行 `cf:build`，由现有脚本清除上传产物中的本地环境配置。
