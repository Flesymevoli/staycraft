# Backend (first development slice)

This FastAPI service decides whether a new guest question can use a **confirmed** property fact. It returns a draft and its citation, or a review reason. `auto_reply_ready` means eligible for a future send flow; `sent` is always `false`. The current rules are a conservative baseline, not model-generated AI, and no channel or database is connected yet.

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
