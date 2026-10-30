import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasRealEmail } from "@/lib/auth";
import { todayIn } from "@/lib/domain/dates";
import { sendEmail } from "@/lib/email";
import { buildMonthlyReport, monthKey, reportMonthFor } from "@/lib/monthly-report";

// Runs daily (vercel.json). Each opted-in user gets last month's report once, on the first run after
// their own month turns over, so time zones and a missed run both sort themselves out.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await db.userPreference.findMany({
    where: { monthlyReport: true },
    select: {
      userId: true,
      timezone: true,
      weekStartsOn: true,
      monthlyReportSentFor: true,
      user: { select: { email: true, name: true } },
    },
  });

  let sent = 0;
  let empty = 0;
  let failed = 0;
  for (const p of prefs) {
    const today = todayIn(p.timezone);
    const month = reportMonthFor(today);
    const key = monthKey(month);
    if ((p.monthlyReportSentFor ?? "") >= key || !hasRealEmail(p.user.email)) continue;

    // Claim the month first, so two overlapping runs can never send it twice.
    const claimed = await db.userPreference.updateMany({
      where: { userId: p.userId, monthlyReport: true, monthlyReportSentFor: p.monthlyReportSentFor },
      data: { monthlyReportSentFor: key },
    });
    if (claimed.count === 0) continue;

    try {
      const report = await buildMonthlyReport({ id: p.userId, name: p.user.name, weekStartsOn: p.weekStartsOn, today, month });
      if (!report) {
        empty++;
        continue;
      }
      await sendEmail({ to: p.user.email, ...report });
      sent++;
    } catch (e) {
      // Release the claim so tomorrow's run tries again.
      await db.userPreference.update({ where: { userId: p.userId }, data: { monthlyReportSentFor: p.monthlyReportSentFor } });
      console.error("monthly report failed", p.userId, e);
      failed++;
    }
  }
  return NextResponse.json({ checked: prefs.length, sent, empty, failed });
}
