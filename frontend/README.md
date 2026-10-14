# Homestay AI 五页交互原型

当前已实现的前端技术栈：Next.js App Router、React、TypeScript 和 Tailwind CSS 4。规划中的 FastAPI 与 Supabase 尚未接入，详见 [`ARCHITECTURE`](../docs/ARCHITECTURE.md)。进入本目录后运行 `npm install`（首次）及 `npm run dev`，打开 http://localhost:3000 。根路径进入 `/native-home`，底部导航切换 Home、Work、Analysis、Explore、Mine。

- **Home**：日程、经营重点、待决策入口和示例 AI 问答。
- **Work**：AI 随时回复开关、聊天式客人消息、人工补充回复、提前入住/退款决策及处理记录。
- **Analysis**：入住率、预订进度、房价、市场需求和满意度概览；点选指标看单项详情；文字总结与建议决策。
- **Explore**：需求走势与日期、周边活动/服务、房价和附近住宿比较；组合线索生成可编辑推广草稿。
- **Mine**：民宿资料逐项编辑和上传文件的演示预览。

本项目目前是前端演示：经营数据、评价、活动、客人消息及所谓 AI 回复均为虚构示例；交互状态仅保存在当前浏览器会话。没有真实登录、数据库、模型、文件解析、消息发送、退款、OTA 同步或发布。下一步开发以 [`PRD`](../docs/PRD.md)、[`DESIGN`](../docs/DESIGN.md)、[`ARCHITECTURE`](../docs/ARCHITECTURE.md) 三份边界文件为准。

`/legacy` 用于查看历史单文件原型；其源文件归档在 [`../archive/prototypes/手机原型_柔白新版_v2.html`](../archive/prototypes/手机原型_柔白新版_v2.html)。需要刷新 `public/prototype.html` 时运行 `npm run sync:prototype`。历史版不作为当前开发基线。
