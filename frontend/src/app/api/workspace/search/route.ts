import {verifiedProperty, WorkspaceError, workspaceFailure} from "@/lib/workspace-access";
import {normalizeWorkspaceSearch, workspaceSearchMaxLength} from "@/lib/workspace-search";
import {searchWorkspace} from "@/lib/workspace-search-server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const {supabase, propertyId} = await verifiedProperty();
    const input = new URL(request.url).searchParams.get("q") ?? "";
    if (input.length > workspaceSearchMaxLength || /[\u0000-\u001f\u007f]/.test(input)) throw new WorkspaceError("invalid_search", 400);
    const query = normalizeWorkspaceSearch(input);
    if (!query || query.length > workspaceSearchMaxLength) throw new WorkspaceError("invalid_search", 400);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)]);
    const results = await searchWorkspace(supabase, propertyId, query, signal);
    return Response.json({query, ...results}, {headers: {"Cache-Control": "private, no-store"}});
  } catch (error) {return workspaceFailure(error);}
}
