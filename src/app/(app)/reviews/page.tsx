import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Page } from "@/components/page-header";
import { LinkButton } from "@/components/link-button";
import { HabitDot } from "@/components/habit-dot";
import { StatusPill } from "@/components/status-pill";
import { BarList } from "@/components/charts/bar-list";
import { ReflectionForm } from "@/components/reviews/reflection-form";
import { loadReview, periodFor, type ReviewData, type ReviewView } from "@/lib/data/reviews";
import { addDays, addMonths, isISODate, type ISODate } from "@/lib/domain/dates";
import { formatAmount, formatDay, formatMinutes, formatMonth, formatPercent, formatPoints, formatProgress, formatRange, plural, weekdayName } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const VIEWS: { value: ReviewView; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function shift(view: ReviewView, date: ISODate, dir: 1 | -1): ISODate {
  return view === "day" ? addDays(date, dir) : view === "week" ? addDays(date, 7 * dir) : addMonths(date, dir);
}

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  const user = await requireUser();
  const s = await searchParams;
  const view = (VIEWS.find((v) => v.value === s.view)?.value ?? "week") as ReviewView;
  const date = s.date && isISODate(s.date) && s.date <= user.today ? s.date : user.today;
  const d = await loadReview(user.id, view, date, user.today, user.prefs.weekStartsOn);
  const href = (v: ReviewView, at: ISODate) => `/reviews?view=${v}${at === user.today ? "" : `&date=${at}`}`;
  // The next period is reachable when it has started; land on today if it is the current one.
  const nextStart = shift(view, date, 1);
  const next = nextStart > user.today ? user.today : nextStart;
  const hasNext = periodFor(view, nextStart, user.prefs.weekStartsOn).from <= user.today && next !== date;
  const title =
    view === "day" ? (date === user.today ? "Today" : formatDay(date, "long")) : view === "week" ? `Week of ${formatRange(d.from, d.to)}` : formatMonth(d.from);

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">Reviews</h1>
          <p className="mt-1 text-muted-foreground">{summaryLine(d)}</p>
        </div>
        <nav aria-label="Review period" className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-full bg-surface-strong p-1">
            {VIEWS.map((v) => (
              <Link
                key={v.value}
                href={href(v.value, date)}
                aria-current={v.value === view ? "page" : undefined}
                className={cn("h-8 rounded-full px-3.5 text-sm leading-8", v.value === view ? "bg-background font-medium" : "text-muted-foreground hover:text-foreground")}
              >
                {v.label}
              </Link>
            ))}
          </div>
          <LinkButton variant="ghost" size="icon" aria-label={`Previous ${view}`} href={href(view, shift(view, date, -1))}>
            <ChevronLeft />
          </LinkButton>
          <span className="num min-w-[180px] text-center text-sm">{title}</span>
          {hasNext ? (
            <LinkButton variant="ghost" size="icon" aria-label={`Next ${view}`} href={href(view, next)}>
              <ChevronRight />
            </LinkButton>
          ) : (
            <span className="size-9" aria-hidden="true" />
          )}
        </nav>
      </div>

      <section aria-label="Totals" className="mt-6 rounded-2xl bg-surface p-5">
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-border">
          <Kpi label="Completion" value={formatPercent(d.totals.rate, 1)} lead>
            {d.change === null ? "No earlier data" : `${formatPoints(d.change)} vs previous ${view}`}
          </Kpi>
          <Kpi label="Scheduled" value={`${d.totals.scheduled}`}>{d.totals.scheduled !== d.totals.eligible ? `${d.totals.eligible} due so far` : "occurrences"}</Kpi>
          <Kpi label="Completed" value={`${d.totals.completed}`} />
          <Kpi label="Partly done" value={`${d.totals.partial}`} />
          <Kpi label="Missed" value={`${d.totals.missed}`} />
          {view === "day" ? (
            <Kpi label="Time recorded" value={d.time.totalMinutes ? formatMinutes(d.time.totalMinutes) : "–"}>
              {d.time.totalMinutes ? plural(d.time.sessions, "session") : "No timed entries"}
            </Kpi>
          ) : (
            <Kpi label="Full days" value={`${d.totals.fullDays}`}>of {plural(d.totals.activeDays, "day")} with habits due</Kpi>
          )}
        </dl>
      </section>

      {d.totals.scheduled === 0 && !d.hasEntries ? (
        <p className="mt-6 rounded-2xl bg-surface p-6 text-muted-foreground">Nothing was scheduled in this {view}, so there is nothing to review.</p>
      ) : view === "day" ? (
        <DayReview d={d} journal={user.prefs.journalEnabled} />
      ) : (
        <PeriodReview d={d} />
      )}
    </Page>
  );
}

function summaryLine(d: ReviewData): string {
  const t = d.totals;
  if (t.eligible === 0) return d.to > d.today ? "This period hasn't started yet." : "Nothing was due in this period.";
  const base = `${t.completed} of ${t.eligible} done`;
  return d.to >= d.today ? `${base} so far. Days still to come aren't counted.` : `${base}${t.missed ? `, ${t.missed} missed` : ""}.`;
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

const STATUS_PILL = {
  complete: ["positive", "Done"],
  partial: ["progress", "Partly done"],
  missed: ["negative", "Missed"],
  pending: ["neutral", "Not yet"],
  future: ["neutral", "Upcoming"],
} as const;

function DayReview({ d, journal }: { d: ReviewData; journal: boolean }) {
  const review = d.reviews[0] ?? null;
  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-12">
      <section aria-labelledby="day-habits" className="rounded-2xl bg-surface p-5 lg:col-span-7">
        <h2 id="day-habits" className="text-sm font-medium">
          Scheduled habits
        </h2>
        <ul className="mt-3 grid gap-1">
          {d.dayItems.map((i) => {
            const [tone, label] = STATUS_PILL[i.status];
            return (
              <li key={`${i.habitId}-${i.occurrence}`} className="rounded-xl bg-background px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <HabitDot color={i.color} />
                  <span className="font-medium">{i.count > 1 ? `${i.name} (${i.occurrence + 1} of ${i.count})` : i.name}</span>
                  <span className="num text-sm text-muted-foreground">
                    {i.rule === "subhabits"
                      ? `${i.actual} of ${i.target} steps`
                      : i.targetType === "CHECKBOX"
                        ? ""
                        : formatProgress(i.actual, i.target, i.targetType, i.unit)}
                  </span>
                  <StatusPill tone={tone} className="ml-auto">
                    {i.status === "partial" ? `${Math.round(i.progress * 100)}% done` : label}
                  </StatusPill>
                </div>
                {i.subs.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 pl-5 text-sm text-muted-foreground">
                    {i.subs.map((s) => (
                      <li key={s.name} className="flex justify-between gap-3">
                        <span>
                          {s.name}
                          {!s.required && " · optional"}
                        </span>
                        <span className="num">
                          {s.targetType === "CHECKBOX" ? (s.complete ? "Done" : "Not done") : `${formatProgress(s.actual, s.target, s.targetType, s.unit)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
          {d.dayItems.length === 0 && <li className="text-muted-foreground">No day-based habits were scheduled.</li>}
        </ul>
        {d.targets.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-medium">Weekly and monthly targets</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {d.targets.map((t) => (
                <li key={`${t.habitId}-${t.start}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-background px-3 py-2">
                  <span>{t.name}</span>
                  <span className="num text-muted-foreground">
                    {targetAmount(t.actual, t)} of {targetAmount(t.target, t)} · {formatRange(t.start, t.end)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section aria-labelledby="reflection" className="rounded-2xl bg-surface p-5 lg:col-span-5">
        <h2 id="reflection" className="text-sm font-medium">
          Reflection
        </h2>
        {journal ? (
          <>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">Private to you. Skip anything you don&apos;t want to track.</p>
            <ReflectionForm key={d.from} date={d.from} initial={review} />
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            The journal is switched off. Turn it on in <Link href="/settings" className="underline underline-offset-4">Settings</Link>.
          </p>
        )}
      </section>
    </div>
  );
}

function targetAmount(v: number, t: ReviewData["targets"][number]) {
  return t.targetType === "CHECKBOX" ? plural(Math.round(v * 10) / 10, "session") : formatAmount(v, t.targetType, t.unit === "min" ? null : t.unit);
}

function PeriodReview({ d }: { d: ReviewData }) {
  const rated = d.perHabit.filter((h) => h.rate !== null);
  const best = rated.length ? rated.reduce((a, b) => (b.rate! > a.rate! ? b : a)) : null;
  const worst = rated.length > 1 ? rated.reduce((a, b) => (b.rate! < a.rate! ? b : a)) : null;
  const days = d.byWeekday.filter((w) => w.eligible > 0);
  const bestDay = days.length ? days.reduce((a, b) => ((b.rate ?? 0) > (a.rate ?? 0) ? b : a)) : null;
  const metTargets = d.targets.filter((t) => t.status === "complete").length;
  const endedTargets = d.targets.filter((t) => t.status === "complete" || t.status === "missed").length;
  const suggestions = d.insights.filter((i) => i.kind === "focus" || i.kind === "pattern");
  const notes = d.insights.filter((i) => i.kind !== "focus" && i.kind !== "pattern");

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-12">
      <section aria-labelledby="highlights" className="rounded-2xl bg-surface p-5 lg:col-span-5">
        <h2 id="highlights" className="text-sm font-medium">
          Highlights
        </h2>
        <dl className="mt-3 grid gap-3">
          <Fact label="Strongest habit" value={best ? `${best.name}, ${formatPercent(best.rate)}` : "–"} detail={best ? `${best.completed} of ${best.eligible}` : undefined} />
          <Fact label="Weakest habit" value={worst && worst.habitId !== best?.habitId ? `${worst.name}, ${formatPercent(worst.rate)}` : "–"} detail={worst ? `${worst.completed} of ${worst.eligible}` : undefined} />
          {d.view === "month" && (
            <Fact label="Best day of the week" value={bestDay ? `${bestDay.weekday}, ${formatPercent(bestDay.rate)}` : "–"} detail={bestDay ? `${bestDay.completed} of ${bestDay.eligible}` : undefined} />
          )}
          <Fact
            label="Targets met"
            value={endedTargets ? `${metTargets} of ${endedTargets}` : "–"}
            detail={endedTargets ? formatPercent((metTargets / endedTargets) * 100) : "No target periods ended"}
          />
          <Fact label="Time recorded" value={d.time.totalMinutes ? formatMinutes(d.time.totalMinutes) : "–"} detail={d.time.sessions ? plural(d.time.sessions, "session") : undefined} />
        </dl>
      </section>

      <section aria-labelledby="notes" className="rounded-2xl bg-surface p-5 lg:col-span-7">
        <h2 id="notes" className="text-sm font-medium">
          What the numbers say
        </h2>
        {notes.length === 0 && suggestions.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Not enough history yet for comparisons. They appear once there are a few days to compare.</p>
        ) : (
          <>
            {notes.length > 0 && (
              <ul className="mt-3 grid list-disc gap-2 pl-5">
                {notes.map((n) => (
                  <li key={n.text}>{n.text}</li>
                ))}
              </ul>
            )}
            {suggestions.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-medium">For next {d.view}</h3>
                <ul className="mt-2 grid list-disc gap-2 pl-5">
                  {suggestions.map((n) => (
                    <li key={n.text}>{n.text}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="by-habit" className="rounded-2xl bg-surface p-5 lg:col-span-7">
        <h2 id="by-habit" className="text-sm font-medium">
          By habit
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 text-left font-normal">Habit</th>
              <th className="pb-2 text-right font-normal">Done</th>
              <th className="pb-2 text-right font-normal">Rate</th>
              <th className="pb-2 text-right font-normal">Previous</th>
              <th className="pb-2 text-right font-normal">Streak</th>
            </tr>
          </thead>
          <tbody>
            {d.perHabit.map((h) => (
              <tr key={h.habitId} className="border-t border-rule">
                <td className="py-2 pr-2">
                  <span className="inline-flex items-center gap-2">
                    <HabitDot color={h.color} />
                    {h.name}
                  </span>
                </td>
                <td className="num py-2 text-right">
                  {h.completed}
                  <span className="text-muted-foreground"> / {h.eligible}</span>
                </td>
                <td className="num py-2 text-right">{formatPercent(h.rate)}</td>
                <td className="num py-2 text-right text-muted-foreground">{formatPercent(h.prevRate)}</td>
                <td className="num py-2 text-right">
                  {h.streakNow.current}
                  <span className="text-muted-foreground">
                    {h.streakNow.current !== h.streakBefore.current
                      ? ` (${h.streakNow.current > h.streakBefore.current ? "+" : "−"}${Math.abs(h.streakNow.current - h.streakBefore.current)})`
                      : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="by-category" className="rounded-2xl bg-surface p-5 lg:col-span-5">
        <h2 id="by-category" className="mb-3 text-sm font-medium">
          {d.view === "week" ? "Day by day" : "By category"}
        </h2>
        {d.view === "week" ? (
          <BarList
            rows={d.series.map((s) => ({
              key: s.date,
              label: weekdayName(s.date),
              sublabel: formatDay(s.date, "short"),
              value: s.rate,
              valueText: s.date > d.today ? "Upcoming" : formatPercent(s.rate),
              detail: s.eligible ? `${s.completed} of ${s.eligible}` : s.date > d.today ? undefined : "Nothing due",
            }))}
          />
        ) : (
          <BarList
            rows={d.categories.map((c) => ({ key: c.key, label: c.key, value: c.rate, valueText: formatPercent(c.rate), detail: `${c.completed} of ${c.eligible}` }))}
          />
        )}
      </section>

      {d.reviews.length > 0 && (
        <section aria-labelledby="reflections" className="rounded-2xl bg-surface p-5 lg:col-span-12">
          <h2 id="reflections" className="text-sm font-medium">
            Your notes
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {d.reviews.map((r) => (
              <li key={r.date} className="rounded-xl bg-background p-3">
                <p className="text-sm text-muted-foreground">
                  {formatDay(r.date)}
                  {[r.mood && `mood ${r.mood}/5`, r.energy && `energy ${r.energy}/5`, r.sleepQuality && `sleep ${r.sleepQuality}/5`].filter(Boolean).map((x) => ` · ${x}`)}
                </p>
                {r.reflection && <p className="mt-1 whitespace-pre-line">{r.reflection}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-xl bg-background px-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right">
        {value}
        {detail && <span className="num block text-xs text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  );
}
