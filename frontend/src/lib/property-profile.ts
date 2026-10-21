export type PropertyProfile = { name: string; location: string; roomCount: string; breakfast: string; checkin: string; notes: string };
export const blankProfile: PropertyProfile = { name: "", location: "", roomCount: "", breakfast: "", checkin: "", notes: "" };
export const profileFields = [
  { key: "name", en: "Property name", zh: "民宿名称", max: 120 },
  { key: "location", en: "Location", zh: "位置", max: 300 },
  { key: "roomCount", en: "Number of rooms", zh: "客房数量", max: 3 },
  { key: "breakfast", en: "Breakfast hours", zh: "早餐时间", max: 11 },
  { key: "checkin", en: "Check-in time", zh: "入住时间", max: 5 },
  { key: "notes", en: "House rules & guest information", zh: "入住规则与客人须知", max: 2000 },
] as const;

export function validateProfile(input: unknown): PropertyProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const values = input as Record<string, unknown>;
  if (Object.keys(values).some(key => !Object.hasOwn(blankProfile, key))) return null;
  const result = { ...blankProfile };
  for (const { key, max } of profileFields) {
    if (typeof values[key] !== "string") return null;
    result[key] = values[key].trim();
    if (result[key].length > max || /\u0000/.test(result[key])) return null;
  }
  result.breakfast = result.breakfast.replace(/[-—]/g, "–");
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!result.name || (result.roomCount && !/^[1-9]\d{0,2}$/.test(result.roomCount))) return null;
  if (result.checkin && !clock.test(result.checkin)) return null;
  if (result.breakfast) {
    const [start, end, extra] = result.breakfast.split("–");
    if (!start || !end || extra || !clock.test(start) || !clock.test(end) || start >= end) return null;
  }
  return result;
}

export type ImportCandidate = { key: keyof PropertyProfile; value: string; source: string };
const aliases: Record<string, keyof PropertyProfile> = {
  name: "name", propertyname: "name", 民宿名称: "name", 名称: "name",
  location: "location", address: "location", 位置: "location", 地址: "location",
  roomcount: "roomCount", rooms: "roomCount", 客房数量: "roomCount", 房间数量: "roomCount",
  breakfast: "breakfast", breakfasthours: "breakfast", 早餐时间: "breakfast",
  checkin: "checkin", checkintime: "checkin", 入住时间: "checkin",
  notes: "notes", houserules: "notes", 入住规则: "notes", 客人须知: "notes",
};
const fieldKey = (value: string) => aliases[value.trim().toLowerCase().replace(/[\s_-]/g, "")];

function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(cell.trim()); cell = "";
      if (char === "\n") { rows.push(row); row = []; }
    } else cell += char;
  }
  if (quoted) throw new Error("invalid_csv");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

// Extract explicit labelled facts only. No model guesses and no document instructions executed.
export function parsePropertyText(text: string, csv: boolean) {
  if (text.length > 100000 || text.includes("\u0000")) throw new Error("text_too_large");
  const candidates: ImportCandidate[] = []; const conflicts = new Set<string>();
  const add = (label: string, value: string, source: string) => {
    const key = fieldKey(label); if (!key || !value.trim()) return;
    const field = profileFields.find(item => item.key === key)!;
    if (value.trim().length > field.max) { conflicts.add(key); return; }
    const existing = candidates.find(item => item.key === key);
    if (existing && existing.value !== value.trim()) { conflicts.add(key); return; }
    if (!existing) candidates.push({ key, value: value.trim(), source: source.slice(0, 500) });
  };
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (csv) {
    const rows = csvRows(clean);
    if (rows[0]?.length >= 2 && rows[0].every(label => fieldKey(label))) {
      if (rows.length !== 2) throw new Error("one_property_only");
      rows[0].forEach((label, i) => add(label, rows[1][i] ?? "", `${label}: ${rows[1][i] ?? ""}`));
    } else rows.forEach(row => { if (row.length === 2) add(row[0], row[1], row.join(": ")); });
  } else {
    clean.split("\n").forEach(line => {
      const match = line.match(/^\s*([^:：\t]{1,40})[:：\t]\s*(.+)$/);
      if (match) add(match[1], match[2], line);
    });
  }
  return { candidates: candidates.filter(item => !conflicts.has(item.key)), conflicts: [...conflicts], excerpt: clean.slice(0, 10000) };
}
