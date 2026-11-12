import type { BookingMetrics } from "@/components/booking-metrics";

export const DEMO_PERIOD = { start: "2026-11-11", end: "2026-11-17" } as const;

export function workspaceDay(demo: boolean) {
  return demo ? DEMO_PERIOD.start : new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
}

export function demoMetrics(data: BookingMetrics): BookingMetrics {
  if (data.period_start < DEMO_PERIOD.start || data.period_end > DEMO_PERIOD.end) return data;
  const capacity = data.active_rooms;
  const occupancy = (booked: number, roomNights: number) =>
    roomNights ? Math.round(booked * 1000 / roomNights) / 10 : null;
  const capacityNights = capacity * data.period_days;
  return {
    ...data,
    as_of: DEMO_PERIOD.start,
    historical_inventory_unknown: false,
    capacity_room_nights: capacityNights,
    available_room_nights: Math.max(0, capacityNights - data.booked_room_nights),
    booked_pct: occupancy(data.booked_room_nights, capacityNights),
    amount_per_capacity_night_cents: capacityNights && data.amount_cents != null ? Math.round(data.amount_cents / capacityNights) : null,
    daily: data.daily.map(day => ({
      ...day,
      capacity,
      available: Math.max(0, capacity - day.booked),
      booked_pct: occupancy(day.booked, capacity),
    })),
  };
}
