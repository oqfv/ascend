import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Page } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { AnalyticsFilters } from "@/components/analytics/filters";
import { resolveRange } from "@/lib/analytics-range";
import { HabitRanking } from "@/components/analytics/habit-ranking";
import { ChartFrame, DataTable, LegendLine } from "@/components/charts/chart-frame";
import { TrendChart } from "@/components/charts/trend-chart";
import { ColumnChart } from "@/components/charts/column-chart";
import { BarList } from "@/components/charts/bar-list";
import { HeatLegend, RangeHeatmap } from "@/components/charts/heatmap";
import { StatusPill } from "@/components/status-pill";
import { HabitDot } from "@/components/habit-dot";
import { loadAnalytics, type AnalyticsData } from "@/lib/data/analytics";
import { loadCategories, loadHabits } from "@/lib/data/habits";
import type { ISODate } from "@/lib/domain/dates";
import { formatAmount, formatDay, formatMinutes, formatPercent, formatPoints, formatRange, plural } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

type Search = { range?: string; from?: string; to?: string; habit?: string; category?: string; compare?: string };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const s = await searchParams;
  const { range, from, to } = resolveRange(s, user.today);
  const [habits, categories] = await Promise.all([loadHabits(user.id), loadCategories(user.id)]);
  const habitId = habits.some((h) => h.id === s.habit) ? s.habit! : null;
  const categoryId = categories.some((c) => c.id === s.category) ? s.category! : null;
  const compare = s.compare !== "0";
  const data = await loadAnalytics(user.id, { from, to, habitId, categoryId, compare }, user.today, user.prefs.weekStartsOn);

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Analytics</h1>
          <p className="mt-1 text-muted-foreground">{headline(data)}</p>
        </div>
        <LinkButton variant="ghost" href={`/api/export/records?from=${from}&to=${to}`} prefetch={false}>
          <Download /> Export records
        </LinkButton>
      </div>
      <div className="mt-5">
        <AnalyticsFilters
          range={range}
          from={from}
          to={to}
          habitId={habitId}
          categoryId={categoryId}
          compare={compare}
          habits={habits.map((h) => ({ id: h.id, name: h.archivedOn ? `${h.name} (archived)` : h.name }))}
          categories={categories}
        />
      </div>

      {data.habitsInScope === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface p-6">
          <h2 className="text-base font-medium">No habits match these filters</h2>
          <p className="mt-1 text-muted-foreground">Clear the habit or category filter, or add a habit first.</p>
        </div>
      ) : (
        <Body data={data} today={user.today} weekStartsOn={user.prefs.weekStartsOn} compare={compare} />
      )}
    </Page>
  );
}

/** The finding the screen leads with, stated with its period and its baseline. */
function headline(d: AnalyticsData): string {
  const period = formatRange(d.query.from, d.query.to);
  if (d.totals.eligible === 0) return `Nothing was due between ${period}.`;
  const base = `${formatPercent(d.totals.rate)} of due habits done, ${period}`;
  if (d.change === null) return `${base}. No earlier period to compare with yet.`;
  if (Math.abs(d.change) < 0.05) return `${base}, the same as the ${plural(d.span, "day")} before.`;
  return `${base}, ${d.change > 0 ? "up" : "down"} ${Math.abs(d.change).toFixed(1)} points on the ${plural(d.span, "day")} before.`;
}

function Body({ data: d, today, weekStartsOn, compare }: { data: AnalyticsData; today: ISODate; weekStartsOn: number; compare: boolean }) {
  const t = d.totals;
  const change = d.change;
  const prevLabel = `vs ${formatRange(d.prevFrom, d.prevTo)}`;

  return (
    <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      {/* KPI strip: one container split by rules. The rate leads; everything else is its evidence. */}
      <section aria-label="Totals" className="rounded-2xl bg-surface p-5 lg:col-span-12">
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-border">
          <Kpi label="Completion rate" lead value={formatPercent(t.rate, 1)}>
            <span className={cn(change !== null && change < -0.05 ? "text-negative" : change !== null && change > 0.05 ? "text-positive" : "")}>
              {formatPoints(change)}
            </span>{" "}
            {change !== null && <span>{prevLabel}</span>}
          </Kpi>
          <Kpi label="Completed" value={`${t.completed}`}>of {plural(t.eligible, "due occurrence")}</Kpi>
          <Kpi label="Partly done" value={`${t.partial}`}>
            {t.progressRate !== null ? `${formatPercent(t.progressRate, 1)} with partial credit` : "–"}
          </Kpi>
          <Kpi label="Missed" value={`${t.missed}`}>Today is never counted as missed</Kpi>
          <Kpi label="Full days" value={`${t.fullDays}`}>of {plural(t.activeDays, "day")} with habits due</Kpi>
          <Kpi label="Time recorded" value={d.hasDurationHabits ? formatMinutes(d.time.totalMinutes) : "–"}>
            {d.hasDurationHabits ? `${plural(d.time.sessions, "session")}` : "No timed habits"}
          </Kpi>
        </dl>
      </section>

      <ChartFrame
        className="lg:col-span-8"
        title="Daily completion"
        summary={`Share of due habits completed each ${d.granularity}. Gaps mean nothing was due.`}
        aside={
          compare && d.prevTotals ? (
            <>
              <LegendLine label="This period" />
              <LegendLine dashed label="Previous period" />
            </>
          ) : compare ? (
            <span>No previous data to compare</span>
          ) : null
        }
        table={
          <DataTable
            head={["Period", "Completed", "Due", "Rate", ...(compare && d.prevTotals ? ["Previous"] : [])]}
            rows={d.trend.map((p) => [
              d.granularity === "day" ? formatDay(p.start) : formatRange(p.start, p.end),
              p.completed,
              p.eligible,
              formatPercent(p.rate),
              ...(compare && d.prevTotals ? [formatPercent(p.prevRate)] : []),
            ])}
          />
        }
      >
        <TrendChart data={d.trend} granularity={d.granularity} compare={compare && Boolean(d.prevTotals)} />
      </ChartFrame>

      <ChartFrame
        className="lg:col-span-4"
        title="Weekly performance"
        summary="Completion rate per week. Hover for the counts."
        table={<DataTable head={["Week", "Completed", "Due", "Rate"]} rows={d.weeks.map((w) => [formatRange(w.start, w.end), w.completed, w.eligible, formatPercent(w.rate)])} />}
      >
        <ColumnChart
          unit="percent"
          height={240}
          data={d.weeks.map((w) => ({
            x: formatDay(w.start, "short"),
            title: `Week of ${formatRange(w.start, w.end)}`,
            value: w.rate,
            lines: [
              { label: "Completed", value: `${w.completed} of ${w.eligible}` },
              { label: "Rate", value: formatPercent(w.rate, 1) },
            ],
          }))}
        />
      </ChartFrame>

      <ChartFrame
        className={d.span > 120 ? "lg:col-span-12" : "lg:col-span-5"}
        title="Calendar"
        summary="Each square is a day. Dashed squares had nothing scheduled, which is different from a day with nothing done."
        aside={<HeatLegend />}
      >
        <RangeHeatmap days={d.series} today={today} weekStartsOn={weekStartsOn} />
      </ChartFrame>

      <div className="lg:col-span-7">
        <HabitRanking
          rows={d.perHabit.map((h) => ({
            habitId: h.habitId,
            name: h.name,
            categoryName: h.categoryName,
            kind: h.kind,
            rate: h.rate,
            completed: h.completed,
            eligible: h.eligible,
            archived: h.archived,
          }))}
        />
      </div>

      <ChartFrame
        className="lg:col-span-5"
        title="Categories"
        summary="Completion rate by category, from every habit in it."
        table={<DataTable head={["Category", "Completed", "Due", "Rate"]} rows={d.categories.map((c) => [c.name, c.completed, c.eligible, formatPercent(c.rate, 1)])} />}
      >
        {d.categories.length === 0 ? (
          <p className="text-muted-foreground">Nothing was due in this range.</p>
        ) : (
          <BarList
            rows={d.categories.map((c) => ({
              key: c.key || "none",
              label: c.name,
              value: c.rate,
              valueText: formatPercent(c.rate),
              detail: `${c.completed} of ${c.eligible}`,
            }))}
          />
        )}
      </ChartFrame>

      <Targets data={d} />
      <Streaks data={d} />
      {d.hasDurationHabits && <TimeSpent data={d} prevLabel={prevLabel} wide={d.span > 120} />}
    </div>
  );
}

function Kpi({ label, value, lead, children }: { label: string; value: string; lead?: boolean; children?: React.ReactNode }) {
  return (
    <div className="lg:px-5 lg:first:pl-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("num mt-1", lead ? "text-[32px] leading-10" : "text-2xl")}>{value}</dd>
      {children && <dd className="mt-1 text-xs text-muted-foreground">{children}</dd>}
    </div>
  );
}

const STATUS = {
  complete: { tone: "positive", label: "Completed" },
  missed: { tone: "negative", label: "Missed" },
  "in-progress": { tone: "neutral", label: "On the way" },
  upcoming: { tone: "neutral", label: "Upcoming" },
} as const;

function Targets({ data: d }: { data: AnalyticsData }) {
  const amount = (v: number, t: (typeof d.targets)[number]) =>
    t.targetType === "CHECKBOX" ? plural(Math.round(v * 100) / 100, "session") : formatAmount(v, t.targetType, t.unit);
  return (
    <ChartFrame
      className="lg:col-span-7"
      title="Weekly and monthly targets"
      summary="A target is only marked missed after its period ends."
      table={
        d.targets.length ? (
          <DataTable
            head={["Habit", "Period", "Target", "Actual", "Remaining", "Status"]}
            rows={d.targets.map((t) => [t.name, formatRange(t.start, t.end), amount(t.target, t), amount(t.actual, t), amount(t.remaining, t), STATUS[t.status].label])}
          />
        ) : undefined
      }
    >
      {d.targets.length === 0 ? (
        <p className="text-muted-foreground">
          {d.hasPeriodic ? "No target periods end in this range." : "None of these habits has a weekly or monthly target. Add one in a habit's schedule."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {d.targets.slice(0, 8).map((t) => (
            <li key={`${t.habitId}-${t.start}`} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <HabitDot color={t.color} />
                <span className="font-medium">{t.name}</span>
                <span className="text-sm text-muted-foreground">{formatRange(t.start, t.end)}</span>
                <StatusPill tone={STATUS[t.status].tone} className="ml-auto">
                  {STATUS[t.status].label}
                </StatusPill>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
                <div className="h-full rounded-full bg-data" style={{ width: `${Math.round(t.progress * 100)}%` }} />
              </div>
              <p className="num text-sm text-muted-foreground">
                {t.targetType === "CHECKBOX" ? `${t.actual} of ${amount(t.target, t)}` : `${amount(t.actual, t)} of ${amount(t.target, t)}`} ·{" "}
                {formatPercent(t.progress * 100)}
                {t.status === "in-progress" && ` · ${amount(t.remaining, t)} to go, ${plural(t.daysLeft, "day")} left`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}

function Streaks({ data: d }: { data: AnalyticsData }) {
  return (
    <ChartFrame className="lg:col-span-5" title="Streaks and consistency" summary="Days a habit isn't scheduled never break its streak.">
      {d.streaks.length === 0 ? (
        <p className="text-muted-foreground">No active habits.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 text-left font-normal">Habit</th>
              <th className="pb-2 text-right font-normal">Current</th>
              <th className="pb-2 text-right font-normal">Longest</th>
              <th className="pb-2 text-right font-normal">Hit / missed</th>
            </tr>
          </thead>
          <tbody>
            {d.streaks.map((s) => (
              <tr key={s.habitId} className="border-t border-rule">
                <td className="py-2 pr-2">
                  <span className="inline-flex items-center gap-2">
                    <HabitDot color={s.color} />
                    {s.name}
                  </span>
                </td>
                <td className="num py-2 text-right">
                  {s.current} <span className="text-muted-foreground">{s.unit}{s.current === 1 ? "" : "s"}</span>
                </td>
                <td className="num py-2 text-right">{s.longest}</td>
                <td className="num py-2 text-right text-muted-foreground">
                  {s.successes} / {s.misses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ChartFrame>
  );
}

function TimeSpent({ data: d, prevLabel, wide }: { data: AnalyticsData; prevLabel: string; wide: boolean }) {
  const tm = d.time;
  const delta = tm.prevTotalMinutes === null ? null : tm.totalMinutes - tm.prevTotalMinutes;
  return (
    <ChartFrame
      className={wide ? "lg:col-span-12" : "lg:col-span-7"}
      title="Time and effort"
      summary="Only minutes you actually recorded. A ticked checkbox adds no time."
      table={
        <DataTable head={["Habit", "Minutes", "Time"]} rows={tm.byHabit.map((b) => [b.name, Math.round(b.minutes), formatMinutes(b.minutes)])} />
      }
    >
      <div className="grid gap-6">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">Total</dt>
            <dd className="num mt-1 text-2xl">{formatMinutes(tm.totalMinutes)}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">
              {delta === null ? "No earlier time to compare" : `${delta >= 0 ? "+" : "−"}${formatMinutes(Math.abs(delta))} ${prevLabel}`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Per session</dt>
            <dd className="num mt-1 text-2xl">{tm.averageMinutes === null ? "–" : formatMinutes(Math.round(tm.averageMinutes))}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">Average of {plural(tm.sessions, "session")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Most time</dt>
            <dd className="mt-1 truncate text-2xl">{tm.byHabit[0]?.name ?? "–"}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{tm.byHabit[0] ? formatMinutes(tm.byHabit[0].minutes) : "Nothing recorded"}</dd>
          </div>
        </dl>
        <div>
          <h3 className="mb-2 text-sm text-muted-foreground">Minutes per week</h3>
          <ColumnChart
            unit="minutes"
            data={tm.weeks.map((w) => ({
              x: formatDay(w.start, "short"),
              title: `Week of ${formatDay(w.start, "short")}`,
              value: w.minutes,
              lines: [{ label: "Recorded", value: formatMinutes(w.minutes) }],
            }))}
          />
        </div>
        <div>
          <h3 className="mb-3 text-sm text-muted-foreground">By category</h3>
          {tm.byCategory.length === 0 ? (
            <p className="text-muted-foreground">No time recorded in this range.</p>
          ) : (
            <BarList
              max={Math.max(...tm.byCategory.map((c) => c.minutes))}
              rows={tm.byCategory.map((c) => ({ key: c.name, label: c.name, value: c.minutes, valueText: formatMinutes(c.minutes) }))}
            />
          )}
        </div>
      </div>
    </ChartFrame>
  );
}
