# Homestay AI 前端技术方案

开发方案：**Next.js + React + TypeScript + Tailwind CSS 4** 前端，**FastAPI + Pydantic** 后端，**Supabase PostgreSQL + Auth** 负责持久数据与登录。shadcn/ui 按需用于基础组件；MVP 不加 Redis 或 LangChain。部署目标是前端 Vercel、FastAPI Render、数据与认证 Supabase。后端、数据库和部署目前都还只是选定方案，尚未在仓库实现或上线。

当前前端在 `frontend/`，共有 Home、Work、Analysis、Explore、Mine 五个 React 页面。历史单文件 HTML 在 `archive/prototypes/`，`/legacy` 路径用于对照。运行和页面说明见 `frontend/README.md`。完整开发边界以 `docs/PRD.md`、`docs/DESIGN.md` 和 `docs/ARCHITECTURE.md` 为准。

当前演示数据留在本地，不接入真实预订平台、数据库或 AI 服务。所有需要对外承诺、发送、退款或发布的动作均未实际执行；目前确认动作仅影响演示界面。
