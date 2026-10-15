type Input = { question?: unknown; language?: unknown; auto_reply_enabled?: unknown };

const sampleFacts = [
  { key: "breakfast", value: "07:30–10:00", status: "confirmed" },
  { key: "checkin", value: "14:00", status: "confirmed" },
] as const;

export async function POST(request: Request) {
  let input: Input;
  try {
    const raw = await request.text();
    if (raw.length > 16_000) return Response.json({ error: "invalid_request" }, { status: 400 });
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    input = parsed as Input;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (!question || question.length > 2000 || !["en", "zh"].includes(String(input.language)) || typeof input.auto_reply_enabled !== "boolean") {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const baseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  try {
    const upstream = await fetch(new URL("/v1/reply-decisions", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        language: input.language,
        auto_reply_enabled: input.auto_reply_enabled,
        facts: sampleFacts,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return Response.json({ error: "decision_unavailable" }, { status: 502 });
    return new Response(await upstream.text(), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "decision_unavailable" }, { status: 503 });
  }
}
