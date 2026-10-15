const examples = {
  arrival: {
    kind: "early_checkin", standard_time: "14:00", requested_time: "12:00",
    cleaning_ready: null, room_available: true,
  },
  refund: {
    kind: "refund", requested_on: "2026-09-18", arrival_on: "2026-09-22",
    paid_amount_yuan: 1040, payment_confirmed: true, full_refund_min_days: 3,
  },
} as const;

export async function POST(request: Request) {
  let id: "arrival" | "refund";
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed) || !("id" in parsed) || (parsed.id !== "arrival" && parsed.id !== "refund")) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    id = parsed.id;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const upstream = await fetch(new URL("/v1/demo/operation-advice", process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(examples[id]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return Response.json({ error: "advice_unavailable" }, { status: 502 });
    return new Response(await upstream.text(), {
      status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "advice_unavailable" }, { status: 503 });
  }
}
