import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMPORT_COLUMNS, TEMPLATE_ROWS, toCsv } from "@/lib/csv";
import { fromDbDate, isISODate, maxDate, todayIn, toDbDate } from "@/lib/domain/dates";
import { versionOn } from "@/lib/domain/schedule";
import { loadHabits } from "@/lib/data/habits";

const DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function file(name: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

// Every export is built from the signed-in user's own rows only; nothing is cached across users.
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind === "template") return file("ascend-import-template.csv", toCsv([...IMPORT_COLUMNS], TEMPLATE_ROWS));

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const userId = session.user.id;
  const prefs = await db.userPreference.findUnique({ where: { userId } });
  const today = todayIn(prefs?.timezone ?? "UTC");

  if (kind === "habits") {
    const habits = await loadHabits(userId);
    const rows = habits.map((h) => {
      const v = versionOn(h, maxDate(today, h.startDate)) ?? h.schedules[h.schedules.length - 1];
      return [
        h.name,
        h.description,
        h.categoryName,
        v.frequency.toLowerCase(),
        v.weekdays.map((d) => DAY[d]).join(","),
        v.intervalDays,
        v.timesPerDay,
        v.targetType.toLowerCase(),
        v.targetValue,
        v.targetUnit,
        h.startDate,
        h.endDate,
        h.archivedOn ? "archived" : v.paused ? "paused" : "active",
      ];
    });
    return file(`ascend-habits-${today}.csv`, toCsv([...IMPORT_COLUMNS, "status"], rows));
  }

  if (kind === "records") {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const range = {
      ...(from && isISODate(from) ? { gte: toDbDate(from) } : {}),
      ...(to && isISODate(to) ? { lte: toDbDate(to) } : {}),
    };
    const where = { userId, ...(Object.keys(range).length ? { date: range } : {}) };
    const [logs, subLogs] = await Promise.all([
      db.habitLog.findMany({ where, include: { habit: { select: { name: true } } }, orderBy: [{ date: "asc" }] }),
      db.subHabitLog.findMany({
        where,
        include: { habit: { select: { name: true } }, subHabit: { select: { name: true, targetUnit: true } } },
        orderBy: [{ date: "asc" }],
      }),
    ]);
    const rows = [
      ...logs.map((l) => [fromDbDate(l.date), l.habit.name, "", l.occurrence + 1, l.value, l.note]),
      ...subLogs.map((l) => [fromDbDate(l.date), l.habit.name, l.subHabit.name, l.occurrence + 1, l.value, ""]),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const label = from || to ? `${from ?? "start"}-to-${to ?? today}` : `all-to-${today}`;
    return file(`ascend-records-${label}.csv`, toCsv(["date", "habit", "step", "occurrence", "value", "note"], rows));
  }

  return NextResponse.json({ error: "Unknown export." }, { status: 404 });
}
