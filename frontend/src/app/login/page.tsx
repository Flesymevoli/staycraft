import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import "./auth.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let authenticated = false;
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getClaims();
      authenticated = Boolean(data?.claims?.sub);
    } catch {
      // A failed Auth request leaves the login form available for retry.
    }
  }
  if (authenticated) redirect("/app");

  return <div className="auth-shell"><LoginForm configured={hasSupabaseConfig()} /></div>;
}
