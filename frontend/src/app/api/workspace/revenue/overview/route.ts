import { readAgentRevenue } from "@/lib/agent-revenue";
import { workspaceDay } from "@/lib/demo-period";
import { isDemoWorkspace } from "@/lib/operator-sample";
import { verifiedProperty, workspaceFailure, WorkspaceError } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase, propertyId, user } = await verifiedProperty();
    const today = workspaceDay(isDemoWorkspace(user.email));
    const previousDay = (days: number) => new Date(Date.parse(today) - days * 86_400_000).toISOString().slice(0, 10);
    const period = { start: previousDay(7), end: previousDay(1) };
    const revenue = await readAgentRevenue(supabase, propertyId, period, request.signal, today)
      .catch(() => { throw new WorkspaceError("revenue_unavailable", 503); });
    return Response.json({
      period,
      completed: revenue.totals.completed,
      breakdowns: revenue.breakdowns,
      comparison: revenue.comparison,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return workspaceFailure(error);
  }
}
