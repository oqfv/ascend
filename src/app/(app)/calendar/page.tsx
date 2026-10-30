import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Page } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { HeatCell, HeatLegend, heatLevel } from "@/components/charts/heatmap";
import { CalendarFilter } from "@/components/calendar-filter";
import { loadHabits, loadLogs } from "@/lib/data/habits";
import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "@/lib/domain/dates";
import { dailySeries, totalsOf } from "@/lib/domain/analytics";
import { formatDay, formatMonth, formatPercent, plural } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; habit?: string }> }) {
  const user = await requireUser();
  const s = await searchParams;
  const month = s.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(s.month) ? `${s.month}-01` : startOfMonth(user.today);
  const all = await loadHabits(user.id);
  const habitId = all.some((h) => h.id === s.habit) ? s.habit! : null;
  const habits = habitId ? all.filter((h) => h.id === habitId) : all;

  const ws = user.prefs.weekStartsOn;
  const gridFrom = startOfWeek(month, ws);
  const gridTo = endOfWeek(endOfMonth(month), ws);
  const { store } = await loadLogs(user.id, gridFrom, gridTo);
  const ctx = { logs: store, today: user.today, weekStartsOn: ws };
  const days = dailySeries(habits, gridFrom, gridTo, ctx);
  const inMonth = days.filter((d) => d.date.slice(0, 7) === month.slice(0, 7));
  const t = totalsOf(inMonth);

  const prev = addMonths(month, -1).slice(0, 7);
  const next = addMonths(month, 1).slice(0, 7);
  const q = (m: string) => `/calendar?month=${m}${habitId ? `&habit=${habitId}` : ""}`;

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{formatMonth(month)}</h1>
          <p className="mt-1 text-muted-foreground">
            {t.eligible === 0
              ? "Nothing was due this month yet."
              : `${formatPercent(t.rate)} done · ${plural(t.fullDays, "full day")} of ${t.activeDays} with habits due.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarFilter habits={all.map((h) => ({ id: h.id, name: h.name }))} habitId={habitId} month={month.slice(0, 7)} />
          <LinkButton variant="ghost" size="icon" aria-label="Previous month" href={q(prev)}>
            <ChevronLeft />
          </LinkButton>
          <LinkButton variant="ghost" href={q(user.today.slice(0, 7))}>
            This month
          </LinkButton>
          <LinkButton variant="ghost" size="icon" aria-label="Next month" href={q(next)}>
            <ChevronRight />
          </LinkButton>
        </div>
      </div>

      <section aria-label={`${formatMonth(month)} calendar`} className="mt-6 rounded-2xl bg-surface p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="grid">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} role="columnheader" className="px-1 pb-1 text-xs text-muted-foreground">
              {NAMES[(ws + i) % 7]}
            </div>
          ))}
          {days.map((d) => {
            const level = heatLevel(d, user.today);
            const outside = d.date.slice(0, 7) !== month.slice(0, 7);
            const label =
              d.date > user.today
                ? `${formatDay(d.date)}: upcoming`
                : d.eligible === 0
                  ? `${formatDay(d.date)}: nothing scheduled`
                  : `${formatDay(d.date)}: ${d.completed} of ${d.eligible} done`;
            return (
              <Link
                key={d.date}
                href={`/today?date=${d.date}`}
                aria-label={label}
                title={label}
                className={cn(
                  "relative flex aspect-square min-h-11 flex-col justify-between rounded-lg bg-background p-1.5 transition-colors hover:ring-2 hover:ring-control sm:aspect-[5/4] sm:p-2",
                  outside && "opacity-40",
                  d.date === user.today && "ring-2 ring-foreground",
                )}
              >
                <span className="num text-xs sm:text-sm">{Number(d.date.slice(8))}</span>
                <span className="flex items-end justify-between gap-1">
                  <HeatCell level={level} className="size-3 sm:size-4" aria-hidden="true" />
                  {d.eligible > 0 && (
                    <span className="num hidden text-xs text-muted-foreground sm:inline">
                      {d.completed}/{d.eligible}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4">
          <HeatLegend />
        </div>
      </section>
      <p className="mt-3 text-sm text-muted-foreground">Select a day to see or change what you recorded.</p>
    </Page>
  );
}
