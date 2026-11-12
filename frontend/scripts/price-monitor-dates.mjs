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
  // Continuous seven-day window starting tomorrow: every night is collected separately so the
  // market table can show per-night prices instead of an average across the stay.
  return Array.from({length: 7}, (_, index) => add(index + 1));
}
