import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { loadDay } from "@/lib/data/day";
import { addDays, minutesNowIn, toDbDate, todayIn } from "@/lib/domain/dates";
import { dueReminders, reminderMessage, type ReminderItem } from "@/lib/domain/reminders";
import { formatAmount } from "@/lib/format";
import { pushConfigured, pushToUser } from "@/lib/push";

// Called every few minutes by a scheduler (see docs/REMINDERS.md). Sends each habit's reminder once,
// at its reminder time in the user's own time zone, only if the habit isn't done yet.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ error: "Push keys are not set." }, { status: 503 });

  // Only people with a device turned on and at least one live habit with a reminder.
  const users = await db.user.findMany({
    where: { pushSubscriptions: { some: {} }, habits: { some: { reminderEnabled: true, reminderTime: { not: null }, archivedOn: null } } },
    select: { id: true, preference: { select: { timezone: true, weekStartsOn: true } } },
  });

  let sent = 0;
  let failed = 0;
  for (const u of users) {
    try {
      const tz = u.preference?.timezone ?? "UTC";
      const today = todayIn(tz);
      const now = minutesNowIn(tz);
      const [view, already] = await Promise.all([
        loadDay(u.id, today, today, u.preference?.weekStartsOn ?? 1),
        db.reminderSent.findMany({ where: { userId: u.id, date: toDbDate(today) }, select: { key: true } }),
      ]);
      const items: ReminderItem[] = view.items.map((i) => ({
        habitId: i.habitId,
        name: i.name,
        reminderTime: i.reminderTime,
        complete: i.kind === "period" && i.period ? i.period.status === "complete" || i.complete : i.complete,
        progress: i.progress,
        targetText: i.rule === "subhabits" ? `${i.target} steps` : i.targetType === "CHECKBOX" ? null : formatAmount(i.target, i.targetType, i.unit),
      }));
      for (const r of dueReminders(items, now, new Set(already.map((a) => a.key)))) {
        // Claim it first, so two overlapping runs can never send the same reminder twice.
        try {
          await db.reminderSent.create({ data: { userId: u.id, date: toDbDate(today), key: r.habitId } });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
          throw e;
        }
        const { title, body } = reminderMessage(r);
        if ((await pushToUser(u.id, { title, body, url: "/today", tag: `habit-${r.habitId}` })) > 0) sent++;
      }
    } catch (e) {
      console.error("reminders failed", u.id, e);
      failed++;
    }
  }

  // Keep the sent list short: only the last week matters.
  await db.reminderSent.deleteMany({ where: { date: { lt: toDbDate(addDays(todayIn("UTC"), -7)) } } });
  return NextResponse.json({ users: users.length, sent, failed });
}

export const GET = run;
export const POST = run;
