import {isHosted} from "@/lib/deployment";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import "./auth.css";
import {operatorSample} from "@/lib/operator-sample";

export const dynamic = "force-dynamic";

export default async function LoginPage({searchParams}:{searchParams:Promise<{confirmation?:string}>}) {
  const confirmationFailed=(await searchParams).confirmation==='failed';
  let authenticated = false;
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      // Use the same current-user check as /app to avoid a redirect loop for a
      // revoked/deleted account whose signed token has not expired yet.
      const { data, error } = await supabase.auth.getUser();
      authenticated = !error && Boolean(data.user);
    } catch {
      // A failed Auth request leaves the login form available for retry.
    }
  }
  if (authenticated) redirect("/app");

  return <div className="auth-shell"><LoginForm configured={hasSupabaseConfig()} confirmationFailed={confirmationFailed} demoAvailable={operatorSample()||Boolean(process.env.DEMO_LOGIN_EMAIL&&process.env.DEMO_LOGIN_PASSWORD)} prototypeAvailable={!isHosted()&&!operatorSample()} /></div>;
}
