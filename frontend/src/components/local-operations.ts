"use client";
import { useEffect, useState } from "react";
import { useDemoStorage } from "./demo-storage";

export type OperationMeta = { id: "arrival" | "refund"; kind: string; order_id: string; room: string; guest: string; arrival_on: string; requested_on: string; requested_time: string | null; standard_time: string | null; paid_amount_yuan: number | null };
export type Operations = { source: "local_reservations" | "prototype"; items: OperationMeta[]; decisions: { id: string; decision: string; created_at: string; external_status: "not_started" }[] };
const prototypeItems: OperationMeta[] = [
  { id: "arrival", kind: "early_checkin", order_id: "sample-102", room: "102", guest: "Alex", arrival_on: "2026-09-18", requested_on: "2026-09-18", requested_time: "12:00", standard_time: "14:00", paid_amount_yuan: null },
  { id: "refund", kind: "refund", order_id: "GH-204", room: "204", guest: "Casey", arrival_on: "2026-09-22", requested_on: "2026-09-18", requested_time: null, standard_time: null, paid_amount_yuan: 1040 },
];

export function useLocalOperations() {
  const [legacy, setLegacy] = useDemoStorage<Record<string,string>>("operationDecisions", {});
  const [result, setResult] = useState<{ data: Operations | null; status: "loading" | "ready" | "error" }>({ data: null, status: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const reload = () => setRevision(n => n + 1);
    window.addEventListener("staycraft-operations-updated", reload);
    return () => window.removeEventListener("staycraft-operations-updated", reload);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/local/operations", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok && response.status !== 404) throw new Error();
      const data = response.status === 404 ? { source: "prototype", items: prototypeItems, decisions: [] } as Operations : await response.json() as Operations;
      if (!Array.isArray(data.items) || !Array.isArray(data.decisions)) throw new Error();
      setResult({ data, status: "ready" });
    }).catch(() => { if (!controller.signal.aborted) setResult({ data: null, status: "error" }); });
    return () => controller.abort();
  }, [revision]);
  const data = result.data?.source === "prototype" ? { ...result.data, decisions: Object.entries(legacy).map(([id, decision]) => ({ id, decision, created_at: "", external_status: "not_started" as const })) } : result.data;
  return { data, status: result.status, pending: data?.items.filter(item => !data.decisions.some(d => d.id === item.id)) ?? [],
    retry: () => { setResult({ data: null, status: "loading" }); setRevision(n => n + 1); },
    update: (next: Operations) => { setResult({ data: next, status: "ready" }); window.dispatchEvent(new Event("staycraft-operations-updated")); },
    recordPrototype: (id: string, decision: string) => setLegacy(current => ({ ...current, [id]: decision })),
    resetPrototype: () => setLegacy({}) };
}
