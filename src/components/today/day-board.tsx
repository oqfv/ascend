"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, ChevronDown, Flame } from "lucide-react";
import type { DayItem, DayView } from "@/lib/data/day";
import { setHabitValue, setHideCompleted, setSubHabitValue } from "@/app/(app)/today/actions";
import { formatAmount, formatPercent, formatProgress, plural } from "@/lib/format";
import { HabitDot } from "@/components/habit-dot";
import { StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";
import { AmountInput, CheckButton } from "./amount-control";
import { Climb } from "./climb";
import { applyOverrides, habitKey, subKey, type Overrides } from "./recompute";

export function DayBoard({ view, hideCompleted: hideInitial }: { view: DayView; hideCompleted: boolean }) {
  const { date, today } = view;
  const isFuture = date > today;
  const [overrides, setOverride] = useOptimistic<Overrides, Overrides>({}, (s, next) => ({ ...s, ...next }));
  const [, startTransition] = useTransition();
  const [hide, setHide] = useState(hideInitial);

  const items = useMemo(() => view.items.map((i) => applyOverrides(i, overrides, date, today)), [view.items, overrides, date, today]);
  const steps = items.filter((i) => i.kind === "day");
  const done = steps.filter((i) => i.complete).length;
  const partial = steps.filter((i) => !i.complete && i.progress > 0).length;
  const open = steps.length - done - partial;
  const rate = steps.length ? (done / steps.length) * 100 : null;
  const credit = steps.length ? (steps.reduce((s, i) => s + i.progress, 0) / steps.length) * 100 : null;
  const doneCount = items.filter((i) => i.complete).length;
  const visible = hide ? items.filter((i) => !i.complete) : items;

  function save(key: string, value: number, previous: number, run: () => Promise<{ ok: boolean; error?: string }>, undoLabel?: string) {
    startTransition(async () => {
      setOverride({ [key]: value });
      const res = await run();
      if (!res.ok) {
        toast.error(res.error ?? "That didn't save. Try again.");
        return;
      }
      if (undoLabel) {
        toast(undoLabel, {
          action: {
            label: "Undo",
            onClick: () => save(key, previous, value, () => runFor(key, previous)),
          },
        });
      }
    });
  }

  // Resolves a key back to its action so Undo uses the same path as the original change.
  // Keys are "h:<habitId>:<occurrence>" or "s:<habitId>:<occurrence>:<subHabitId>".
  function runFor(key: string, value: number) {
    const [kind, habitId, occurrence, subId] = key.split(":");
    const item = view.items.find((i) => i.key === `${habitId}:${occurrence}`)!;
    const entry = { date, occurrence: item.occurrence, value };
    return kind === "s" && subId ? setSubHabitValue(item.habitId, subId, entry) : setHabitValue(item.habitId, entry);
  }

  function setHabit(item: DayItem, value: number) {
    const key = habitKey(item);
    const completes = item.target > 0 ? value >= item.target && item.actual < item.target : value > 0 && item.actual === 0;
    save(key, value, item.actual, () => runFor(key, value), completes ? `${item.name} done` : undefined);
  }

  function setSub(item: DayItem, subId: string, value: number, previous: number) {
    const key = subKey(item, subId);
    save(key, value, previous, () => runFor(key, value));
  }

  function toggleHide() {
    const next = !hide;
    setHide(next);
    void setHideCompleted(next);
  }

  if (!view.hasHabits) {
    return (
      <div className="mt-8 rounded-2xl bg-surface p-6">
        <h2 className="text-base font-medium">Start with one habit</h2>
        <p className="mt-1 max-w-[52ch] text-muted-foreground">
          Add something you already mean to do. A simple checkbox is fine; you can add targets and steps later.
        </p>
        <Link href="/habits/new" className="mt-4 inline-flex h-9 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/85">
          Add your first habit
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4">
      {steps.length > 0 && (
        <section aria-label="Progress for the day" className="rounded-2xl bg-surface p-5">
          <Climb items={items} />
          <dl className="mt-5 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
            <Stat label="Done" value={`${done}`} sub={`of ${steps.length}`} />
            <Stat label="Partly done" value={`${partial}`} />
            <Stat label={date < today ? "Missed" : isFuture ? "Scheduled" : "Still to do"} value={`${open}`} />
            <Stat
              label="Completion"
              value={formatPercent(rate)}
              sub={credit !== null && credit !== rate ? `${formatPercent(credit)} with partial credit` : undefined}
            />
          </dl>
        </section>
      )}

      <section aria-labelledby="checklist-title" className="rounded-2xl bg-surface p-2 sm:p-3">
        <div className="flex items-center justify-between gap-4 px-3 pt-2 pb-3">
          <h2 id="checklist-title" className="text-sm font-medium">
            {items.length === 0 ? "Nothing scheduled" : plural(items.length, "habit")}
          </h2>
          {doneCount > 0 && (
            <button type="button" onClick={toggleHide} aria-pressed={hide} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {hide ? `Show ${doneCount} done` : "Hide done"}
              <ChevronDown className={cn("size-4 transition-transform", hide && "-rotate-90")} />
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-3 pb-4 text-muted-foreground">No habits are scheduled on this day. Days off don&apos;t count against your streaks.</p>
        ) : visible.length === 0 ? (
          <p className="px-3 pb-4 text-muted-foreground">Everything here is done.</p>
        ) : (
          <ul className="grid gap-1">
            {visible.map((item) => (
              <HabitRow
                key={item.key}
                item={item}
                isFuture={isFuture}
                onSet={(v) => setHabit(item, v)}
                onSetSub={(id, v, prev) => setSub(item, id, v, prev)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="sm:px-5 sm:first:pl-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="num text-2xl">{value}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}

function scheduleText(item: DayItem): string {
  if (item.kind === "period" && item.period) {
    const p = item.period;
    const unit = p.targetType === "CHECKBOX" ? "sessions" : null;
    const amount =
      p.targetType === "CHECKBOX"
        ? `${p.actual} of ${p.target} ${unit}`
        : formatProgress(p.actual, p.target, p.targetType, item.unit);
    return `${p.label}: ${amount}`;
  }
  if (item.rule === "subhabits") return `${item.actual} of ${item.target} steps`;
  if (item.targetType === "CHECKBOX") return item.occurrencesToday > 1 ? `Time ${item.occurrence + 1} of ${item.occurrencesToday}` : "Daily check";
  return `Target ${formatAmount(item.target, item.targetType, item.unit)}`;
}

function HabitRow({
  item,
  isFuture,
  onSet,
  onSetSub,
}: {
  item: DayItem;
  isFuture: boolean;
  onSet: (value: number) => void;
  onSetSub: (subId: string, value: number, previous: number) => void;
}) {
  const label = item.occurrencesToday > 1 ? `${item.name}, time ${item.occurrence + 1}` : item.name;
  const pill =
    item.status === "complete" ? null : item.status === "missed" ? (
      <StatusPill tone="negative">Missed</StatusPill>
    ) : item.status === "partial" ? (
      <StatusPill tone="progress">{Math.round(item.progress * 100)}% done</StatusPill>
    ) : item.status === "future" ? (
      <StatusPill tone="neutral">Upcoming</StatusPill>
    ) : null;

  // Steps decide completion: a ring. A checkbox habit: a check. Anything measured: an amount.
  const lead =
    item.rule === "subhabits" ? (
      <span className="grid size-7 shrink-0 place-items-center" aria-hidden="true">
        <ProgressRing progress={item.progress} />
      </span>
    ) : item.targetType === "CHECKBOX" ? (
      <CheckButton
        checked={item.complete}
        disabled={isFuture}
        label={`Mark ${label} ${item.complete ? "not done" : "done"}`}
        onToggle={() => onSet(item.complete ? 0 : 1)}
      />
    ) : (
      <span className="grid size-7 shrink-0 place-items-center" aria-hidden="true">
        <ProgressRing progress={item.kind === "period" && item.period ? item.period.progress : item.progress} />
      </span>
    );
  const amount =
    item.rule === "self" && item.targetType !== "CHECKBOX" ? (
      <AmountInput
        value={item.actual}
        target={item.target}
        targetType={item.targetType}
        unit={item.unit}
        disabled={isFuture}
        label={`Amount for ${label}`}
        onCommit={onSet}
      />
    ) : null;

  return (
    <li className="rounded-xl bg-background px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {lead}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <HabitDot color={item.color} />
            <span className={cn("font-medium", item.complete && "text-muted-foreground")}>{label}</span>
            {pill}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {item.categoryName && <span>{item.categoryName}</span>}
            <span className="num">{scheduleText(item)}</span>
            {item.kind === "period" && item.period && item.period.status === "in-progress" && (
              <span>{plural(item.period.daysLeft, "day")} left</span>
            )}
            {item.streak.current > 0 && (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3.5" aria-hidden="true" />
                {item.streak.capped ? "365+" : item.streak.current} {item.streak.unit}
                {item.streak.current === 1 ? "" : "s"} in a row
              </span>
            )}
            {item.reminderTime && (
              <span className="inline-flex items-center gap-1">
                <Bell className="size-3.5" aria-hidden="true" />
                {item.reminderTime}
              </span>
            )}
          </p>
          {item.kind === "period" && item.period && <ProgressLine progress={item.period.progress} className="mt-2 max-w-[280px]" />}
        </div>
        {amount}
      </div>

      {item.subs.length > 0 && (
        <ul className="mt-3 grid gap-1 border-l-2 border-rule pl-4 sm:ml-[13px] sm:pl-6">
          {item.subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1">
              {s.targetType === "CHECKBOX" ? (
                <CheckButton
                  size="sm"
                  checked={s.complete}
                  disabled={isFuture}
                  label={`Mark ${s.name} ${s.complete ? "not done" : "done"}`}
                  onToggle={() => onSetSub(s.id, s.complete ? 0 : 1, s.actual)}
                />
              ) : null}
              <span className={cn("min-w-0 flex-1", s.complete && "text-muted-foreground")}>
                {s.name}
                {!s.required && <span className="text-muted-foreground"> · optional</span>}
                {s.targetType !== "CHECKBOX" && (
                  <span className="num ml-2 text-sm text-muted-foreground">{formatProgress(s.actual, s.target, s.targetType, s.unit)}</span>
                )}
              </span>
              {s.targetType !== "CHECKBOX" && (
                <AmountInput
                  value={s.actual}
                  target={s.target}
                  targetType={s.targetType}
                  unit={s.unit}
                  disabled={isFuture}
                  label={`Amount for ${s.name}`}
                  onCommit={(v) => onSetSub(s.id, v, s.actual)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ProgressLine({ progress, className }: { progress: number; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-data-track", className)} aria-hidden="true">
      <div className="h-full rounded-full bg-data transition-[width] duration-300 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 28 28" className="size-7 -rotate-90">
      <circle cx="14" cy="14" r={r} fill="none" stroke="var(--data-track)" strokeWidth="3" />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke="var(--data)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}
