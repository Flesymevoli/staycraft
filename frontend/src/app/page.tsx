import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "./landing-page";
import "./landing.css";
import {operatorSample} from '@/lib/operator-sample';

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "StayCraft · AI 经营决策工作台",
  description: "整合民宿订单与房态，由 AI 主动调查经营问题、查询酒店市场报价并提供有依据的决策建议。",
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
  return <LandingPage demoAvailable={operatorSample()||Boolean(process.env.DEMO_LOGIN_EMAIL&&process.env.DEMO_LOGIN_PASSWORD)}/>;
}
