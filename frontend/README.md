# Homestay AI 五页交互原型

当前前端使用 Next.js App Router、React、TypeScript 和 Tailwind CSS 4。进入本目录后运行 `npm install`（首次）及 `npm run dev`，打开 http://localhost:3000 。根路径进入 `/native-home`，底部导航切换 Home、Work、Analysis、Explore、Mine。

- **Home**：日程、经营重点、待决策入口和示例 AI 问答。
- **Work**：AI 随时回复开关、聊天式客人消息、人工补充回复、提前入住/退款决策及处理记录。
- **Analysis**：入住率、预订进度、房价、市场需求和满意度概览；点选指标看单项详情；文字总结与建议决策。
- **Explore**：需求走势与日期、周边活动/服务、房价和附近住宿比较；组合线索生成可编辑推广草稿。
- **Mine**：民宿资料逐项编辑和上传文件的演示预览。

`/login` 是正式应用登录入口的本地实现，`/app` 是受保护的占位工作台；接入 Supabase 项目前无法使用真实账号登录。配置方式见 [`AUTH_SETUP`](../docs/AUTH_SETUP.md)。五页 `/native-*` 是公开的课程交互原型，不因 `/app` 的登录保护而变成真实业务页面。

Work 的“试一条客人咨询”和“待你决策”可调用本地 FastAPI **规则演示**。需要另开一个终端进入 `backend/`，先安装 `requirements.txt`，再运行 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`；前端仍运行 `npm run dev`。若后端使用其他地址，在 `frontend/.env.local` 设置 `BACKEND_API_URL`。早餐、入住时间、示例订单与退款规则都是固定示例；结果不会发送消息、修改订单、转账或调用模型。后端未运行时页面会提示重试。

经营数据、评价、活动、客人消息及所谓 AI 回复均为虚构示例；原型交互状态仅保存在当前浏览器会话。没有真实数据库、模型、文件解析、消息发送、退款、OTA 同步或发布。下一步开发以 [`PRD`](../docs/PRD.md)、[`DESIGN`](../docs/DESIGN.md)、[`ARCHITECTURE`](../docs/ARCHITECTURE.md) 三份边界文件为准。

`/legacy` 用于查看历史单文件原型；其源文件归档在 [`../archive/prototypes/手机原型_柔白新版_v2.html`](../archive/prototypes/手机原型_柔白新版_v2.html)。需要刷新 `public/prototype.html` 时运行 `npm run sync:prototype`。历史版不作为当前开发基线。

## 本机资料模式

不需要 Supabase 账号。后端在 backend 目录执行（仅回环监听）：
```powershell
$env:PYTHONPATH='.;.vendor'
$env:HOMESTAY_LOCAL_DATA='1'
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
前端在 frontend 目录执行：
```powershell
$env:HOMESTAY_LOCAL_DATA='1'
npm run dev -- --hostname 127.0.0.1
```
打开 /native-mine，填写并确认「回复依据」，然后到 /native-work 输入早餐或入住时间问题。本地数据库默认为 backend/data/local.sqlite3。关闭两个进程的 HOMESTAY_LOCAL_DATA 开关即可禁用；共享或部署环境不要开启。其他示例及固定事实演示 API 不受影响。运行 UI 回归：`node scripts/qa-local-facts.cjs`（默认端口 3100）。
