"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {AgentRevenue} from "@/lib/agent-revenue";

export type RevenueOverview = {
  period: AgentRevenue["period"];
  completed: AgentRevenue["totals"]["completed"];
  breakdowns: AgentRevenue["breakdowns"];
  comparison: AgentRevenue["comparison"];
};

type RevenueState = {
  scope: string;
  revenue: RevenueOverview | null;
  status: "loading" | "ready" | "error";
};

export function useRevenueOverview(scope: string) {
  const [state, setState] = useState<RevenueState>({scope, revenue: null, status: "loading"});
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let controller: AbortController | undefined;
    async function load() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      const requestSequence = ++sequence.current;
      setState({scope, revenue: null, status: "loading"});
      try {
        const response = await fetch("/api/workspace/revenue/overview", {
          signal: requestController.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("revenue_unavailable");
        const revenue: RevenueOverview = await response.json();
        if (!requestController.signal.aborted && requestSequence === sequence.current) {
          setState({scope, revenue, status: "ready"});
        }
      } catch {
        if (!requestController.signal.aborted && requestSequence === sequence.current) {
          setState({scope, revenue: null, status: "error"});
        }
      }
    }
    void load();
    const events = ["staycraft-stays-changed", "staycraft-import-changed", "staycraft-profile-changed"];
    for (const event of events) window.addEventListener(event, load);
    return () => {
      controller?.abort();
      for (const event of events) window.removeEventListener(event, load);
    };
  }, [scope, revision]);

  const current = state.scope === scope;
  return {
    revenue: current ? state.revenue : null,
    status: current ? state.status : "loading" as const,
    retry,
  };
}
