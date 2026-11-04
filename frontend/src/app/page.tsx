import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "./landing-page";
import "./landing.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StayCraft · 让民宿经营，更轻一点。",
  description: "为小型民宿经营者打造的轻量工作台：日常运营、经营分析与周边报价及推广建议。",
};

export default async function Home() {
  let authenticated = false;
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      authenticated = !error && Boolean(data.user);
    } catch {
      // Keep the public landing available when Auth is unreachable.
    }
  }
  if (authenticated) redirect("/app");
  return <LandingPage />;
}
