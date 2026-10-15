import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import "../login/auth.css";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  if (!hasSupabaseConfig()) redirect("/login");

  let identity: string | undefined;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims?.sub) identity = typeof data.claims.email === "string" ? data.claims.email : data.claims.sub;
  } catch {
    // No verified identity means the protected page must stay closed.
  }
  if (!identity) redirect("/login");

  return <div className="auth-shell"><div className="auth-page">
    <header className="auth-header"><span className="auth-kicker">HOMESTAY AI</span></header>
    <main className="auth-main">
      <h1>Your workspace.</h1>
      <p className="auth-subtitle">Signed in as {identity}</p>
      <div className="auth-card">
        <p>Property information and guest messages will appear here after they are connected.</p>
        <form action={signOut}><button className="auth-submit" type="submit">Sign out</button></form>
      </div>
      <a className="auth-demo-link" href="/native-home">View the interactive prototype <span aria-hidden="true">→</span></a>
    </main>
  </div></div>;
}
