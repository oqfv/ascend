import type { Metadata } from "next";
import { Download, Plus, Upload } from "lucide-react";
import { Page, PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { HabitDot } from "@/components/habit-dot";
import { HabitIcon } from "@/components/habit-icon";
import { StatusPill } from "@/components/status-pill";
import { HabitActions } from "@/components/habits/habit-actions";
import { loadHabits, loadLogs, type HabitView } from "@/lib/data/habits";
import { addDays, maxDate, type ISODate } from "@/lib/domain/dates";
import { habitStats, streakOf } from "@/lib/domain/analytics";
import { isPeriodic, subHabitsOn, versionOn, type ScheduleVersion } from "@/lib/domain/schedule";
import { formatAmount, formatDay, formatPercent } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My habits" };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function scheduleLabel(v: ScheduleVersion): string {
  const target = v.targetType === "CHECKBOX" ? null : formatAmount(v.targetValue, v.targetType, v.targetUnit);
  const times = v.timesPerDay > 1 ? `, ${v.timesPerDay}× a day` : "";
  switch (v.frequency) {
    case "DAILY":
      return `${target ? `${target} ` : ""}every day${times}`;
    case "WEEKDAYS":
      return `${target ? `${target} ` : ""}${v.weekdays.join() === "0,6" ? "weekends" : v.weekdays.map((d) => DAY_NAMES[d]).join(", ")}${times}`;
    case "INTERVAL":
      return `${target ? `${target} ` : ""}every ${v.intervalDays} days${times}`;
    case "WEEKLY":
    case "MONTHLY": {
      const per = v.frequency === "WEEKLY" ? "a week" : "a month";
      return v.targetType === "CHECKBOX" ? `${v.targetValue} times ${per}` : `${target} ${per}`;
    }
  }
}

function stateOf(h: HabitView, today: ISODate): "active" | "paused" | "archived" {
  if (h.archivedOn) return "archived";
  return versionOn(h, maxDate(today, h.startDate))?.paused ? "paused" : "active";
}

export default async function HabitsPage() {
  const user = await requireUser();
  const habits = await loadHabits(user.id);
  const from = addDays(user.today, -29);
  const { store } = await loadLogs(user.id, addDays(user.today, -400), user.today);
  const ctx = { logs: store, today: user.today, weekStartsOn: user.prefs.weekStartsOn };

  const current = habits.filter((h) => !h.archivedOn);
  const archived = habits.filter((h) => h.archivedOn);

  return (
    <Page>
      <PageHeader
        title="My habits"
        description={`${current.length} in use${archived.length ? `, ${archived.length} archived` : ""}. Rates cover the last 30 days.`}
        actions={
          <>
            <LinkButton variant="ghost" href="/habits/import">
              <Upload /> Import
            </LinkButton>
            <LinkButton variant="ghost" href="/api/export/habits" prefetch={false}>
              <Download /> Export
            </LinkButton>
            <LinkButton href="/habits/new">
              <Plus /> New habit
            </LinkButton>
          </>
        }
      />

      {current.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-surface p-6">
          <h2 className="text-base font-medium">No habits yet</h2>
          <p className="mt-1 text-muted-foreground">Add one by hand, or import a list from a spreadsheet.</p>
        </div>
      ) : (
        <HabitTable habits={current} from={from} ctx={ctx} today={user.today} />
      )}

      {archived.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-medium">Archived</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kept for history and analytics. Restore one to track it again.</p>
          <HabitTable habits={archived} from={from} ctx={ctx} today={user.today} />
        </section>
      )}
    </Page>
  );
}

function HabitTable({
  habits,
  from,
  ctx,
  today,
}: {
  habits: HabitView[];
  from: ISODate;
  ctx: Parameters<typeof habitStats>[3];
  today: ISODate;
}) {
  return (
    <div className="mt-4 rounded-2xl bg-surface p-2 sm:p-3">
      <table className="w-full border-separate border-spacing-0">
        <thead className="max-md:sr-only">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-3 pb-2 font-normal">Habit</th>
            <th className="px-3 pb-2 font-normal">Schedule</th>
            <th className="px-3 pb-2 text-right font-normal">Last 30 days</th>
            <th className="px-3 pb-2 text-right font-normal">Streak</th>
            <th className="w-12 pb-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h, i) => {
            const state = stateOf(h, today);
            const v = versionOn(h, maxDate(today, h.startDate)) ?? h.schedules[h.schedules.length - 1];
            const stats = habitStats(h, maxDate(from, h.startDate), today, ctx);
            const streak = streakOf(h, ctx);
            const steps = subHabitsOn(h, maxDate(today, h.startDate)).length;
            return (
              <tr key={h.id} className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1 max-md:py-2">
                <td className="rounded-l-xl bg-background px-3 py-3 max-md:rounded-none max-md:bg-transparent">
                  <div className="flex items-center gap-2">
                    <HabitDot color={h.color} />
                    <HabitIcon name={h.icon} className="size-4 text-muted-foreground" />
                    <span className="font-medium">{h.name}</span>
                    {state === "paused" && <StatusPill tone="neutral">Paused</StatusPill>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[h.categoryName, steps ? `${steps} steps` : null, h.startDate > today ? `Starts ${formatDay(h.startDate, "short")}` : null]
                      .filter(Boolean)
                      .join(" · ") || "No category"}
                  </p>
                </td>
                <td className="bg-background px-3 py-3 text-muted-foreground max-md:col-span-2 max-md:row-start-2 max-md:bg-transparent max-md:py-0">
                  {scheduleLabel(v)}
                  {isPeriodic(v.frequency) && <span className="sr-only"> (target per period)</span>}
                </td>
                <td className="num bg-background px-3 py-3 text-right max-md:hidden">
                  {formatPercent(stats.rate)}
                  <span className="block text-sm text-muted-foreground">
                    {stats.eligible ? `${stats.completed} of ${stats.eligible}` : "Nothing due yet"}
                  </span>
                </td>
                <td className="num bg-background px-3 py-3 text-right max-md:hidden">
                  {streak.current} <span className="text-muted-foreground">{streak.unit}{streak.current === 1 ? "" : "s"}</span>
                  <span className="block text-sm text-muted-foreground">Best {streak.longest}</span>
                </td>
                <td className="rounded-r-xl bg-background py-3 pr-2 text-right max-md:col-start-2 max-md:row-start-1 max-md:rounded-none max-md:bg-transparent">
                  <HabitActions id={h.id} name={h.name} state={state} first={i === 0} last={i === habits.length - 1} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
