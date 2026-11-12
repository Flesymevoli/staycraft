# StayCraft

**AI-Powered Homestay Analytics & Decision Support**

> An AI workspace helping homestay owners analyze their business and make better decisions.

[体验 StayCraft](https://staycraft.online)

## 项目简介

StayCraft 是面向小型民宿经营者的 AI 经营分析与决策支持工作台。

小型民宿经营者往往需要独自兼顾日常运营，时间、人手和分析支持有限。即使已经积累了订单与经营数据，也不容易理解经营表现、发现关键问题，或判断下一步应该做什么。StayCraft 尝试将自身经营数据与外部市场参考联系起来，让分析结果更容易转化为有依据的经营判断和推广行动。

## 核心功能

### 1. 经营数据管理与可视化 · Business Data & Visualization

- 导入并核对订单 CSV，预览新增、改期、取消及重复记录。
- 查看订单、已订间夜、收入等经营数据和可视化图表。
- 管理房型、房量等基础信息，为后续分析提供数据依据。

### 2. 分析与市场观察 · Analysis & Market Insights

- 按日期和经营维度了解预订及收入表现，发现值得进一步调查的变化。
- 查看周边住宿报价，结合入住日期和来源信息获取市场参考。
- 将内部经营数据与市场线索结合，用于理解问题，而不是只凭单一指标判断。

### 3. 决策与推广支持 · Decision & Promotion Support

- 在可用数据与模型配置支持下，生成经营诊断、分析报告和下一步建议。
- 从经营发现出发，规划适合特定日期和客群的推广方案。
- 创建、编辑、保存和复制推广文案，最终由经营者审核和决定是否使用。

## 产品页面

| 页面 | 作用 |
| --- | --- |
| 工作台（`/app`） | 查看经营重点、AI 诊断与报告 |
| 经营数据（`/app/analysis`） | 浏览指标、订单导入和房型房量 |
| 市场调研（`/app/explore`） | 查看周边住宿报价和市场参考 |
| 推广方案（`/app/promotion`） | 制定推广方案、管理宣传草稿 |
| 我的（`/app/mine`） | 维护民宿资料和房型信息 |

## 技术栈

- **前端：** Next.js 16、React 19、TypeScript、Tailwind CSS
- **数据与认证：** Supabase
- **部署：** Cloudflare（OpenNext / Wrangler）
- **AI 能力：** 服务端模型接口与经营分析流程，按环境配置启用
- **质量检查：** ESLint、构建检查及项目内的演示验收脚本

主要 Web 应用位于 `frontend/` 目录。

## 本地运行

要求：**Node.js 24.x** 和 npm。

### 独立演示环境（推荐用于产品预览和宣传素材采集）

```bash
cd frontend
npm ci
npm run build
npm run sample:imports
```

打开 **http://127.0.0.1:3114/login**。

演示账号：`demo@example.invalid`
演示密码：`staycraft-demo`

sample:imports允许高德只读请求，不是完全离线；这个演示使用虚构数据和独立的本地内存环境，重启后会恢复；它不是正式业务数据，也不会默认执行真实 AI 模型调用。

### 常规开发环境

```bash
cd frontend
npm ci
npm run dev
```

需要连接实际后端服务时，请参照 `frontend/.env.example` 配置本地环境变量。不要将真实密钥提交到 Git 仓库。

### 检查

```bash
cd frontend
npm run check
npm run qa:imports
```

## 使用边界

- **订单来源：** 当前以 CSV 导入为主要方式，不应理解为已完成所有 OTA 平台的实时同步。
- **市场数据：** 周边住宿报价是带日期和来源条件的参考信息，不等于实际成交价，也不能直接视为完全可比的房型价格。
- **AI 结果：** 诊断与建议取决于可用数据和模型配置；建议由经营者核实，不替代人工决策。
- **推广功能：** 支持方案与文案准备，不等于自动发布到外部平台。
- **演示数据：** 本地演示与正式用户数据隔离；展示或录制时应明确标记演示内容。

## 项目背景

StayCraft 是 **ENT207 Digital Startup Lab** 课程中的六人团队项目，目标是探索如何通过数据分析、市场观察与 AI 决策支持，降低小型民宿经营者理解经营信息和采取下一步行动的门槛。

**网站：** https://staycraft.online

## 工程接手入口

工作约定见 [AGENTS.md](AGENTS.md)，运行说明见 [frontend/README](frontend/README.md)。按任务需要查阅[工程地图](docs/ENGINEERING_GUIDE.md)、[技术记录](docs/CURRENT_BASELINE.md)、[历史交接](docs/SESSION_HANDOFF.md)和[待办参考](TODO.md)，无需依次阅读。设计以用户最终确认的 Gemini 前端及后续配色调整为准，[设计资料](docs/UI_GUIDELINES.md)仅供定位参考。交接、TODO、日志和状态文件仅在用户明确要求时更新。
