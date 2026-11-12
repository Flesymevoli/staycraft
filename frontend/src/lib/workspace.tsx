import "server-only";
import {cache,type ReactNode} from "react";
import {accountProperty} from "./account-property";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { WorkspaceSection, WorkspaceConnection } from "@/components/workspace-client";
import {WorkbenchPage,WorkbenchShell} from "@/components/workbench-shell";
import { signOut } from "@/app/login/actions";
import { validateProfile } from "@/lib/property-profile";
import {isDemoWorkspace,operatorSample} from "./operator-sample";

const workspaceIdentity=cache(async()=>{
  if (!hasSupabaseConfig()) redirect("/login");
  const supabase = await createClient();
  let email: string | undefined;
  let userId: string | undefined;
  let displayName: string | undefined;
  try {
    // Verify identity on every protected page, not only in a shared layout.
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      userId = data.user.id; email = data.user.email;
      // Display only: user-editable metadata is never used for authorization.
      const meta=data.user.user_metadata;
      displayName=[meta?.display_name,meta?.full_name,meta?.name].find((value):value is string=>typeof value==="string"&&value.trim().length>0)?.trim().slice(0,40);
    }
  } catch { /* An unverified identity cannot open the workspace. */ }
  if (!userId) redirect("/login");
  return {supabase,userId,email:email??"",displayName};
});

export async function renderWorkspaceShell(children:ReactNode){
  const {supabase,userId,email,displayName}=await workspaceIdentity();
  let connection: WorkspaceConnection = { status: "unavailable" };
  try {
    const property=await accountProperty(supabase,userId);
    connection={status:"linked",propertyName:property.name,propertyId:property.id};
    const details=await supabase.from("property_details").select("profile").eq("property_id",property.id).maybeSingle();
    const profile=!details.error&&details.data?validateProfile(details.data.profile):null;
    if(profile)connection.propertyName=profile.name;
  } catch { /* Missing schema or a service failure is not an empty successful read. */ }

  return <WorkbenchShell userId={userId} displayName={displayName} email={email} connection={connection} sample={operatorSample()} demo={isDemoWorkspace(email)} signOutAction={signOut}>{children}</WorkbenchShell>;
}

export async function renderWorkspace(section: WorkspaceSection, roomId?: string, detail?: {bookingId?:string;threadId?:string;bookingHistory?:boolean}) {
  await workspaceIdentity();
  return <WorkbenchPage section={section} roomId={roomId} {...detail}/>;
}
