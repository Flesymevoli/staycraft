import "server-only";
import {accountProperty} from "./account-property";
import { createClient } from "@/lib/supabase/server";

export class WorkspaceError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

export async function verifiedAccount() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new WorkspaceError("sign_in_required", 401);
    return { supabase, user: data.user };
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    throw new WorkspaceError("account_unavailable", 503);
  }
}

export async function verifiedProperty() {
  const { supabase, user } = await verifiedAccount();
  try{const property=await accountProperty(supabase,user.id);return {supabase,propertyId:property.id as string};}
  catch{throw new WorkspaceError("property_unavailable",503);}
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url); expected.host = request.headers.get("host") ?? expected.host;
  if (!origin || origin !== expected.origin) throw new WorkspaceError("invalid_origin", 403);
}

export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length") ?? 0) > max) throw new WorkspaceError("file_too_large", 413);
  const reader = request.body?.getReader(); if (!reader) throw new WorkspaceError("empty_body", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > max) { await reader.cancel(); throw new WorkspaceError("file_too_large", 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export function workspaceFailure(error: unknown) {
  const known = error instanceof WorkspaceError ? error : new WorkspaceError("service_unavailable", 503);
  return Response.json({ error: known.code }, { status: known.status, headers: { "Cache-Control": "no-store" } });
}
