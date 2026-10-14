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
