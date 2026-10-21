import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { WorkspaceClient, type WorkspaceSection, type WorkspaceConnection } from "@/components/workspace-client";
import { signOut } from "@/app/login/actions";

export async function renderWorkspace(section: WorkspaceSection) {
  if (!hasSupabaseConfig()) redirect("/login");
  const supabase = await createClient();
  let email: string | undefined;
  let userId: string | undefined;
  try {
    // Verify identity on every protected page, not only in a shared layout.
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) { userId = data.user.id; email = data.user.email; }
  } catch { /* An unverified identity cannot open the workspace. */ }
  if (!userId) redirect("/login");

  let connection: WorkspaceConnection = { status: "unavailable" };
  try {
    // Read with the user's JWT and RLS; never use a privileged key or demo data.
    const { data, error } = await supabase.from("property_memberships")
      .select("property_id,role,properties(name)")
      .eq("user_id", userId).order("created_at", { ascending: true }).limit(1);
    if (!error && data?.length === 0) connection = { status: "unassigned" };
    else if (!error && data?.length === 1) {
      const row = data[0];
      const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
      if ((row.role === "owner" || row.role === "manager") && property && typeof property.name === "string") {
        connection = { status: "linked", propertyName: property.name };
      }
    }
  } catch { /* Missing schema or a service failure is not an empty successful read. */ }

  return <WorkspaceClient section={section} email={email ?? ""} connection={connection} signOutAction={signOut} />;
}
