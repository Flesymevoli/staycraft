# StayCraft

**AI-Powered Homestay Analytics & Decision Support**

> An AI workspace helping homestay owners analyze their business and make better decisions.

[Online Demo · 网页演示](https://staycraft.online/try) · [Windows Desktop · 桌面版下载](https://github.com/Flesymevoli/staycraft/releases/tag/v0.1.0)

## How to Try StayCraft · 如何体验 StayCraft

### Option 1: Online Demo · 方式一：网页演示

**[Try in your browser / 在浏览器中体验](https://staycraft.online/try)**

**EN:** Open the link to explore StayCraft's interface and user journey directly in your browser. This is an interactive front-end demo using sample data, not the connected desktop application.

**中文：** 点击链接即可体验 StayCraft 的界面与主要操作流程。此版本使用演示数据，属于交互式前端展示，不等同于连接实际服务的桌面应用。

### Option 2: Windows Desktop App · 方式二：Windows 桌面应用

**[Download Windows v0.1.0 / 下载 Windows 版本](https://github.com/Flesymevoli/staycraft/releases/tag/v0.1.0)**

1. **EN:** Download `StayCraft-0.1.0-win-x64.zip` from the release assets. **中文：** 在 Release 页面下载 `StayCraft-0.1.0-win-x64.zip`。
2. **EN:** Extract the entire ZIP file, keeping all files in the same folder. **中文：** 完整解压 ZIP，保留文件夹内所有文件。
3. **EN:** Run `StayCraft.exe` on a 64-bit Windows computer. **中文：** 在 64 位 Windows 电脑上运行 `StayCraft.exe`。

**EN:** The desktop version supports the connected application workflow. Features that use external data or AI may require internet access and appropriate service configuration.

**中文：** 桌面版用于体验连接实际业务服务的应用流程。部分外部数据和 AI 功能需要网络连接及相应服务配置。

### Three Core Features · 三大核心功能

- **Data Analysis · 数据分析：** Interactive dashboards and AI-powered insights / 经营数据可视化与 AI 分析。
- **Market Insights · 市场洞察：** Nearby price comparisons and pricing suggestions / 周边价格比较与调价建议。
- **Marketing Support · 推广支持：** Local events, weather insights, and AI-assisted promotional content / 结合当地活动、天气等线索生成推广内容。

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

这个演示使用虚构数据和独立的本地内存环境，重启后会恢复；它不是正式业务数据，也不会默认执行真实 AI 模型调用。

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

## 开发入口

- [项目约定](AGENTS.md)
- [当前任务清单](docs/CURRENT_BASELINE.md)与[接续交接](docs/SESSION_HANDOFF.md)
- [前端与桌面端运行说明](frontend/README.md)
- [Gemini 最终设计源码与演示入口](frontend/public/concept/README.md)
- [数据库迁移与测试说明](supabase/README.md)

当前业务实现位于 `frontend/`，数据库定义位于 `supabase/migrations/`。设计与交互以 Gemini 最终源码及后续确认的调整为准。

## 其他目录

- [backend/](backend/README.md)：可选的旧本地实验服务，不是桌面端启动依赖。
- [video/staycraft-promo/](video/staycraft-promo/README.md)、[video/staycraft-promo-en/](video/staycraft-promo-en/README.md)：独立视频项目及创作资料。
- 本地课程资料：`课程背景.md` 与 `deliverables/`，未纳入 Git 仓库。

[线上 Gemini 演示](https://staycraft.online/try)是静态前端；真实经营流程使用桌面端与独立账号。
