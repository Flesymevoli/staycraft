# Backend

This FastAPI service decides whether a new guest question can use a **confirmed** property fact. It returns a draft and its citation, or a review reason. `auto_reply_ready` means eligible for a future send flow; `sent` is always `false`. The standalone rules endpoint remains a conservative baseline. The localhost-only application endpoints now load confirmed facts from SQLite and optionally call a configured model; saved owner replies are local demonstrations, never channel sends.

From the repository root, install `backend/requirements.txt`, then run `uvicorn app.main:app --app-dir backend --reload`. The API is available at `POST /v1/reply-decisions` and `GET /health`.

Example body:

```json
{
  "question": "When is breakfast?",
  "language": "en",
  "auto_reply_enabled": true,
  "facts": [{"key": "breakfast", "value": "07:30–10:00", "status": "confirmed"}]
}
```

Run the API and domain tests with `python -m unittest discover -s tests` from `backend/`.

The endpoint currently accepts facts in the request only for local development. Before exposing it to real users, authenticate the caller and load confirmed facts server-side for the caller's authorized property. Never treat client-supplied facts or the auto-reply flag as server authorization.

## 可选模型配置

backend/.env.example 提供变量示例；目前进程从环境变量读取，不自动加载 .env。只在后端设置 MODEL_ENABLED=1、MODEL_API_KEY、MODEL_BASE_URL=https://api.deepseek.com、MODEL_NAME=deepseek-flash 后重启。不要提交真实密钥，不要设为 NEXT_PUBLIC。关闭 MODEL_ENABLED 即恢复规则模式。

换学校服务：若支持 Chat Completions，替换 MODEL_BASE_URL（包含所需 /v1）、MODEL_API_KEY、MODEL_NAME 并重启；否则需调整适配器。任何错误都不会自动切换模型或重试消费。MODEL_ENABLED=0 时可运行全部本地回归；模型测试使用 httpx.MockTransport，不消费额度。

虚构端到端测试：使用独立的 HOMESTAY_LOCAL_DB 文件、MODEL_ENABLED=1 及测试供应商配置启动后端，再让本机 Next BACKEND_API_URL 指向该测试后端。在 frontend 执行 `$env:RUN_PAID_MODEL_TEST='1'; node scripts/qa-model-live.cjs`（默认 QA_PORT=3101），会发一次有输出上限的付费请求；脚本无真实密钥，仅使用固定虚构资料，并恢复原事实。不要把此脚本加入默认批量测试。已有官方接口连通性和虚构客服草稿通过，不代表完整经营分析已完成。

Work 会话回归脚本 `frontend/scripts/qa-work-inbox.cjs` 会写演示回复，须使用独立的全新虚构数据库。默认 QA_PORT=3101、QA_BACKEND=http://127.0.0.1:8013；建议 MODEL_ENABLED=0，避免浏览器回归重复消费API。当前仅迁移两条既有虚构消息，不连接OTA。旧 qa-work-decision/qa-local-facts/qa-model-live 脚本针对已移除的独立测试表单，保留作历史参考，当前界面回归使用 qa-work-inbox。

本机房态：GET `/v1/local/room-board` 返回固定2026-09-17快照、客房和派生统计；POST `/v1/local/room-clean` 接收 `{"room_number":"102"}`，只更新空房清洁状态，在住返回409。schema v6增量插入10间虚构客房和9笔虚构订单，不覆盖旧资料。`frontend/scripts/qa-room-board.cjs` 默认QA_PORT=3102，必须连接独立新建虚构测试库；脚本会将102标记清洁，不可指向展示库或真实数据。

当前schema v7在v6基础上追加虚构历史与未来订单。GET `/v1/local/operation-metrics?days=7|28` 提供7/28日逐日/汇总指标，完成日截止2026-09-16；下周预订取2026-09-21至27日房间夜，按房间和日期去重。`analysis-summary`与推广模型上下文复用同一计算，清洁状态不参与入住率。`frontend/scripts/qa-operation-metrics.cjs`默认QA_PORT=3102，关闭模型后检查Home/Analysis/总结同源、图表明细、加载/空/失败与移动端；不导入真实数据或发起平台动作。
