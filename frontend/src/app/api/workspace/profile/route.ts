import { randomUUID } from "node:crypto";
import { validateProfile } from "@/lib/property-profile";
import { boundedBody, requireSameOrigin, verifiedProperty, WorkspaceError, workspaceFailure } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { supabase, propertyId } = await verifiedProperty();
    const { data, error } = await supabase.from("property_details").select("profile,revision")
      .eq("property_id", propertyId).maybeSingle();
    if (error) throw new WorkspaceError("property_unavailable", 503);
    if (data && !validateProfile(data.profile)) throw new WorkspaceError("property_unavailable", 503);
    return Response.json({ profile: data?.profile ?? null, revision: data?.revision ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return workspaceFailure(error); }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { supabase, propertyId } = await verifiedProperty();
    let body;
    try { body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 16000))); }
    catch (error) { if (error instanceof WorkspaceError) throw error; throw new WorkspaceError("invalid_profile", 400); }
    const profile = validateProfile(body?.profile);
    if (!profile || body.confirmed !== true || !(body.revision === null || /^[a-f0-9-]{36}$/i.test(body.revision ?? ""))) throw new WorkspaceError("invalid_profile", 400);
    const row = { property_id: propertyId, profile, revision: randomUUID(), updated_at: new Date().toISOString() };
    const query = body.revision === null ? supabase.from("property_details").insert(row) :
      supabase.from("property_details").update(row).eq("property_id", propertyId).eq("revision", body.revision);
    const { data, error } = await query.select("profile,revision");
    if (error?.code === "23505" || (!error && data?.length === 0)) throw new WorkspaceError("profile_changed", 409);
    if (error || !data || data.length !== 1) throw new WorkspaceError("save_unavailable", 503);
    return Response.json(data[0], { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return workspaceFailure(error); }
}
