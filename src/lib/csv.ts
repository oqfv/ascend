// CSV writing and the habit import format, shared by the export routes, the import preview
// (client) and the import action (server), so all three agree on what a valid row is.

import { isISODate } from "./domain/dates";
import { habitInput, normalizeHabit, type HabitInput } from "./validation/habit";

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote when needed; prefix formula-looking cells so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export const IMPORT_COLUMNS = [
  "name",
  "description",
  "category",
  "frequency",
  "weekdays",
  "interval_days",
  "times_per_day",
  "target_type",
  "target_value",
  "target_unit",
  "start_date",
  "end_date",
] as const;

export const TEMPLATE_ROWS = [
  ["Read", "Before bed", "Reading", "daily", "", "", "1", "duration", "20", "min", "", ""],
  ["Gym", "", "Fitness", "monthly", "", "", "", "checkbox", "20", "", "", ""],
  ["Practice questions", "", "Education", "weekdays", "mon,wed,fri", "", "1", "count", "10", "questions", "", ""],
  ["Drink water", "", "Health", "daily", "", "", "1", "quantity", "2", "L", "", ""],
];

const FREQ: Record<string, HabitInput["frequency"]> = {
  daily: "DAILY",
  weekdays: "WEEKDAYS",
  days: "WEEKDAYS",
  weekends: "WEEKDAYS",
  interval: "INTERVAL",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};
const TYPES: Record<string, HabitInput["targetType"]> = {
  checkbox: "CHECKBOX",
  check: "CHECKBOX",
  duration: "DURATION",
  time: "DURATION",
  count: "COUNT",
  quantity: "QUANTITY",
  amount: "QUANTITY",
};
const DAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export interface ParsedRow {
  line: number;
  name: string;
  /** Category name as written; matched or created on import. */
  category: string | null;
  input: HabitInput | null;
  errors: string[];
}

/** Turns one CSV record into a validated habit, or a list of plain-language errors. */
export function parseImportRow(rec: Record<string, string>, line: number, today: string): ParsedRow {
  const get = (k: string) => (rec[k] ?? "").trim();
  const errors: string[] = [];
  const name = get("name");
  const freqRaw = get("frequency").toLowerCase() || "daily";
  const frequency = FREQ[freqRaw];
  if (!frequency) errors.push(`Frequency "${get("frequency")}" isn't one of daily, weekdays, interval, weekly, monthly.`);
  const typeRaw = get("target_type").toLowerCase() || "checkbox";
  const targetType = TYPES[typeRaw];
  if (!targetType) errors.push(`Target type "${get("target_type")}" isn't one of checkbox, duration, count, quantity.`);

  let weekdays: number[] = [];
  if (freqRaw === "weekends") weekdays = [0, 6];
  else if (get("weekdays")) {
    for (const part of get("weekdays").toLowerCase().split(/[\s,;|]+/).filter(Boolean)) {
      const d = DAYS[part.slice(0, 3)];
      if (d === undefined) errors.push(`"${part}" isn't a weekday. Use mon, tue, wed…`);
      else weekdays.push(d);
    }
  }

  const num = (k: string, fallback: number | null) => {
    const raw = get(k);
    if (!raw) return fallback;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) errors.push(`${k.replace("_", " ")} "${raw}" isn't a number.`);
    return Number.isFinite(n) ? n : fallback;
  };

  const startDate = get("start_date") || today;
  const endDate = get("end_date") || null;
  if (!isISODate(startDate)) errors.push(`Start date "${startDate}" must look like 2026-01-31.`);
  if (endDate && !isISODate(endDate)) errors.push(`End date "${endDate}" must look like 2026-01-31.`);

  const category = get("category") || null;
  if (errors.length || !frequency || !targetType) return { line, name, category, input: null, errors };

  const candidate = {
    name,
    description: get("description") || null,
    categoryId: null,
    newCategory: category,
    icon: null,
    color: null,
    startDate,
    endDate,
    frequency,
    weekdays,
    intervalDays: frequency === "INTERVAL" ? num("interval_days", null) : null,
    timesPerDay: num("times_per_day", 1) ?? 1,
    targetType,
    targetValue: num("target_value", 1) ?? 1,
    targetUnit: get("target_unit") || null,
    requireSubHabits: true,
    reminderEnabled: false,
    reminderTime: null,
    subHabits: [],
  };
  const parsed = habitInput.safeParse(candidate);
  if (!parsed.success) {
    return { line, name, category, input: null, errors: parsed.error.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`) };
  }
  return { line, name, category, input: normalizeHabit(parsed.data), errors };
}
