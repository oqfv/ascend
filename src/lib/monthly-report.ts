import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { loadReview } from "@/lib/data/reviews";
import { addMonths, startOfMonth, type ISODate } from "@/lib/domain/dates";
import { escapeHtml, type Message } from "@/lib/email";
import { formatMonth, plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

// The opt-in monthly report: last month's numbers, the same ones Reviews shows, by email.

/** The month a report sent today would cover, as its first day: the month before the user's current one. */
export const reportMonthFor = (today: ISODate): ISODate => addMonths(startOfMonth(today), -1);

/** "2026-10" for October 2026: the key stored once a month has been sent. */
export const monthKey = (monthStart: ISODate) => monthStart.slice(0, 7);

// Unsubscribe links carry a signature of the user id, so they work without signing in and can't be
// made for someone else's account.
function sign(userId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set.");
  return createHmac("sha256", secret).update(`monthly-report:${userId}`).digest("base64url");
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const unsubscribeQuery = (userId: string) => `u=${encodeURIComponent(userId)}&t=${sign(userId)}`;

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Builds the email, or null when nothing was due that month, so there is nothing to report. */
export async function buildMonthlyReport(user: {
  id: string;
  name: string;
  weekStartsOn: number;
  today: ISODate;
  month: ISODate;
}): Promise<Omit<Message, "to"> | null> {
  const d = await loadReview(user.id, "month", user.month, user.today, user.weekStartsOn);
  if (d.totals.eligible === 0) return null;

  const monthName = formatMonth(d.from);
  const shortMonth = monthName.split(" ")[0];
  const nextMonth = formatMonth(addMonths(d.from, 1)).split(" ")[0];
  const t = d.totals;
  const progress = Math.round(t.progressRate ?? 0);

  const best = [...d.perHabit].filter((h) => h.eligible >= 3 && h.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];
  const streak = [...d.perHabit].sort((a, b) => b.streakNow.current - a.streakNow.current)[0];

  const lines: string[] = [
    `${t.completed} of ${t.eligible} done${t.partial ? `, ${t.partial} partly done` : ""}${t.missed ? `, ${t.missed} missed` : ""}.`,
  ];
  if (d.change !== null && Math.abs(d.change) >= 0.5) {
    lines.push(`Completion ${d.change > 0 ? "rose" : "fell"} ${Math.abs(d.change).toFixed(0)} points from the month before.`);
  }
  if (best) lines.push(`Your most consistent habit was ${best.name}: ${best.completed} of ${best.eligible} done.`);
  if (streak && streak.streakNow.current >= 2) {
    lines.push(`Going into ${nextMonth}, ${streak.name} is on a streak of ${plural(streak.streakNow.current, streak.streakNow.unit)}.`);
  }
  if (t.activeDays > 0) lines.push(`You finished everything on ${t.fullDays} of ${plural(t.activeDays, "day")} with habits due.`);
  for (const i of d.insights.slice(0, 2)) if (!lines.includes(i.text)) lines.push(i.text);

  const mood = avg(d.reviews.map((r) => r.mood));
  const energy = avg(d.reviews.map((r) => r.energy));
  const sleep = avg(d.reviews.map((r) => r.sleepQuality));
  const journal = [mood && `mood ${mood.toFixed(1)}`, energy && `energy ${energy.toFixed(1)}`, sleep && `sleep ${sleep.toFixed(1)}`].filter(Boolean);
  if (journal.length) lines.push(`Your journal averaged ${journal.join(", ")} out of 5.`);

  const reviewUrl = `${SITE_URL}/reviews?view=month&date=${d.from}`;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?${unsubscribeQuery(user.id)}`;
  const first = user.name.split(" ")[0] || "there";

  const text = [
    `Hi ${first}, here's how ${monthName} went.`,
    "",
    `Progress: ${progress}% (partial days count toward it)`,
    "",
    ...lines.map((l) => `- ${l}`),
    "",
    `See the full review: ${reviewUrl}`,
    "",
    `You get this because you turned on the monthly report. Stop it here: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f7f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f201d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:18px;font-weight:600">Ascend</p>
<p style="margin:0 0 4px;font-size:16px;line-height:24px">Hi ${escapeHtml(first)}, here's how ${escapeHtml(monthName)} went.</p>
<p style="margin:16px 0 4px;font-size:44px;line-height:52px;font-weight:600;letter-spacing:-1px;color:#46683f">${progress}%</p>
<p style="margin:0 0 8px;font-size:14px;line-height:20px;color:#5e5f5b">progress, with partial days counted</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
<td style="background:#ecece7;border-radius:6px;height:10px;padding:0"><div style="width:${Math.min(100, progress)}%;height:10px;background:#46683f;border-radius:6px"></div></td>
</tr></table>
<ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:24px">
${lines.map((l) => `<li style="margin:0 0 8px">${escapeHtml(l)}</li>`).join("\n")}
</ul>
<a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#1f201d;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:12px 20px;border-radius:999px">Open your ${escapeHtml(shortMonth)} review</a>
<p style="margin:32px 0 0;font-size:13px;line-height:20px;color:#5e5f5b">You get this because you turned on the monthly report in Ascend. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5e5f5b">Unsubscribe</a> or change it in Settings.</p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    subject: `Your ${monthName} in Ascend: ${progress}%`,
    text,
    html,
    headers: {
      // One-click unsubscribe straight from the mail app (RFC 8058).
      "List-Unsubscribe": `<${SITE_URL}/api/unsubscribe?${unsubscribeQuery(user.id)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
