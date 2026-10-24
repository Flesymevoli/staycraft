import "server-only";
import {accountProperty} from "./account-property";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { WorkspaceClient, type WorkspaceSection, type WorkspaceConnection } from "@/components/workspace-client";
import { signOut } from "@/app/login/actions";
import { validateProfile } from "@/lib/property-profile";
import {operatorSample} from "./operator-sample";

export async function renderWorkspace(section: WorkspaceSection, roomId?: string, detail?: {bookingId?:string;threadId?:string;bookingHistory?:boolean}) {
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
    const property=await accountProperty(supabase,userId);
    connection={status:"linked",propertyName:property.name,propertyId:property.id};
    const details=await supabase.from("property_details").select("profile").eq("property_id",property.id).maybeSingle();
    const profile=!details.error&&details.data?validateProfile(details.data.profile):null;
    if(profile)connection.propertyName=profile.name;
  } catch { /* Missing schema or a service failure is not an empty successful read. */ }

  return <WorkspaceClient section={section} userId={userId} roomId={roomId} bookingId={detail?.bookingId} bookingHistory={detail?.bookingHistory} threadId={detail?.threadId} email={email ?? ""} connection={connection} sample={operatorSample()} signOutAction={signOut} />;
}
