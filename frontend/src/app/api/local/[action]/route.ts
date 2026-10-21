const paths: Record<string, string> = { facts: "/v1/local/facts", "reply-decision": "/v1/local/reply-decision" };

async function proxy(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // Validate the actual Host first, then compare Origin against that authority.
  let localUrl: URL;
  try { localUrl = new URL(`${new URL(request.url).protocol}//${request.headers.get("host") ?? ""}`); }
  catch { return new Response(null, { status: 400 }); }
  const host = localUrl.hostname;
  if (process.env.HOMESTAY_LOCAL_DATA !== "1" || !["localhost", "127.0.0.1", "[::1]"].includes(host) || !paths[action]) {
    return Response.json({ error: "local_data_disabled" }, { status: 404 });
  }
  if ((action === "facts" && !["GET", "PUT"].includes(request.method)) || (action === "reply-decision" && request.method !== "POST")) {
    return new Response(null, { status: 405 });
  }
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== localUrl.origin) {
    return new Response(null, { status: 403 });
  }
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && body.length > 16000) return new Response(null, { status: 413 });
    const upstream = await fetch(new URL(paths[action], process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000"), {
      method: request.method, headers: { "Content-Type": "application/json" }, body,
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "local_service_unavailable" }, { status: 503 });
  }
}

export const GET = proxy;
export const PUT = proxy;
export const POST = proxy;
