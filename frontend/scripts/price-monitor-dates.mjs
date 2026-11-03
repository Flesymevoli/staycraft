// Keep the same stay dates across collection days so price history is comparable.
export function monitorDates(previous, today) {
  const valid = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(today)) throw new Error("invalid_monitor_day");
  const add = days => {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  // The pilot only reads the nearby visible calendar; do not accept arbitrary horizons.
  const retained = Array.isArray(previous)
    ? previous.filter(date => valid(date) && date >= today && date <= add(31)) : [];
  return [...new Set([...retained.sort(), add(4), add(7)])].slice(0, 2).sort();
}
