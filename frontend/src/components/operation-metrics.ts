"use client";

import { useEffect, useState } from "react";

export type OperationMetrics = {
  sample: boolean; source: string; as_of: string; period_days: number; period_start: string; period_end: string;
  occupancy_pct: number | null; weekday_pct: number | null; weekend_pct: number | null;
  occupancy_change_pp: number | null; occupied_room_nights: number; capacity_room_nights: number;
  daily: { date: string; value: number | null; weekend: boolean; occupied_nights: number; capacity_nights: number }[];
  next_week_start: string; next_week_end: string; next_week_booked_nights: number; next_week_capacity_nights: number;
};

// Public prototype only: a disabled local API (404) may show these fictional fixtures.
// Network/server errors must remain visible rather than masquerading as saved data.
function prototypeMetrics(days: 7 | 28): OperationMetrics {
  const counts = [4,5,6,6,7,8,6,5,5,6,6,7,9,6,4,6,6,6,8,9,7,6,7,9,10,4,5,8];
  const daily = counts.map((n, index) => {
    const date = new Date(Date.UTC(2026, 7, 20 + index));
    return { date: date.toISOString().slice(0,10), value: n * 10, weekend: [0,6].includes(date.getUTCDay()), occupied_nights: n, capacity_nights: 10 };
  }).slice(-days);
  const pct = (items: typeof daily) => Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length);
  return { sample: true, source: "prototype", as_of: "2026-09-17", period_days: days,
    period_start: daily[0].date, period_end: "2026-09-16", daily,
    occupancy_pct: pct(daily), weekday_pct: pct(daily.filter(d => !d.weekend)), weekend_pct: pct(daily.filter(d => d.weekend)),
    occupancy_change_pp: null, occupied_room_nights: daily.reduce((sum, d) => sum + d.occupied_nights, 0), capacity_room_nights: days*10,
    next_week_start: "2026-09-21", next_week_end: "2026-09-27", next_week_booked_nights: 32, next_week_capacity_nights: 70 };
}

export function useOperationMetrics(days: 7 | 28) {
  const [result, setResult] = useState<{ days: number; data: OperationMetrics | null; status: "loading" | "ready" | "error" }>({ days, data: null, status: "loading" });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/local/operation-metrics?days=${days}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok && response.status !== 404) throw new Error();
      const data = response.status === 404 ? prototypeMetrics(days) : await response.json() as OperationMetrics;
      if (data.period_days !== days || !Array.isArray(data.daily) || data.daily.length !== days) throw new Error();
      setResult({ days, data, status: "ready" });
    }).catch(() => { if (!controller.signal.aborted) setResult({ days, data: null, status: "error" }); });
    return () => controller.abort();
  }, [days, reload]);
  return { data: result.days === days ? result.data : null, status: result.days === days ? result.status : "loading",
    retry: () => { setResult({ days, data: null, status: "loading" }); setReload(n => n + 1); } };
}
