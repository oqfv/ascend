// When to send a habit reminder, and what it says. Pure functions only.

/** A reminder that's more than this late (say the scheduler was down) is skipped rather than sent stale. */
export const REMINDER_WINDOW_MIN = 30;

export interface ReminderItem {
  habitId: string;
  name: string;
  reminderTime: string | null; // "HH:mm" in the user's time zone
  complete: boolean;
  progress: number; // 0–1
  targetText: string | null; // "30 min", "20 pages"; null for a checkbox habit
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Habits whose reminder time has come in the last REMINDER_WINDOW_MIN minutes, that aren't done yet
 * and haven't been reminded today. A habit scheduled several times a day is reminded once.
 */
export function dueReminders(items: ReminderItem[], nowMinutes: number, alreadySent: Set<string>): ReminderItem[] {
  const out = new Map<string, ReminderItem>();
  for (const i of items) {
    if (!i.reminderTime || !/^\d{2}:\d{2}$/.test(i.reminderTime) || i.complete || alreadySent.has(i.habitId)) continue;
    const late = nowMinutes - minutesOf(i.reminderTime);
    if (late < 0 || late > REMINDER_WINDOW_MIN) continue;
    if (!out.has(i.habitId)) out.set(i.habitId, i);
  }
  return [...out.values()];
}

/** The notification text. Partial progress is named, because in Ascend part of a habit still counts. */
export function reminderMessage(i: ReminderItem): { title: string; body: string } {
  const pct = Math.round(i.progress * 100);
  if (pct > 0) return { title: i.name, body: `${pct}% done so far. A little more still counts.` };
  if (i.targetText) return { title: i.name, body: `Today's target is ${i.targetText}. Doing part of it still counts.` };
  return { title: i.name, body: "It's time. Tap to mark it done." };
}

// Browsers hand out subscription addresses on their own push services. Anything else is refused,
// so the server can never be made to send requests to an address a user made up.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.port && !u.username && !u.password && PUSH_HOSTS.some((h) => h.test(u.hostname)) && raw.length <= 1000;
  } catch {
    return false;
  }
}
