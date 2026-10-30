import { addDays, startOfWeek, type ISODate } from "@/lib/domain/dates";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface HeatDay {
  date: ISODate;
  /** Occurrences due that day (0 = nothing scheduled). */
  eligible: number;
  completed: number;
  scheduled: number;
}

/** The six-step scale: nothing scheduled, none done, then four bands of completion. */
export function heatLevel(d: HeatDay, today: ISODate): "none" | "future" | 0 | 1 | 2 | 3 | 4 {
  if (d.date > today) return d.scheduled > 0 ? "future" : "none";
  if (d.eligible === 0) return "none";
  const r = d.completed / d.eligible;
  if (r === 0) return 0;
  if (r >= 1) return 4;
  if (r >= 2 / 3) return 3;
  if (r >= 1 / 3) return 2;
  return 1;
}

export const HEAT_STEPS = [
  { level: "none", label: "Nothing scheduled" },
  { level: 0, label: "None done" },
  { level: 1, label: "Under a third" },
  { level: 2, label: "A third or more" },
  { level: 3, label: "Two thirds or more" },
  { level: 4, label: "All done" },
] as const;

export function HeatCell({ level, className, style, ...props }: { level: ReturnType<typeof heatLevel> } & React.ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "block rounded-[4px]",
        level === "none" && "border border-dashed border-control",
        level === "future" && "border border-control",
        className,
      )}
      style={typeof level === "number" ? { ...style, background: `var(--heat-${level})` } : style}
    />
  );
}

export function HeatLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {HEAT_STEPS.map((s) => (
        <li key={String(s.level)} className="inline-flex items-center gap-1.5">
          <HeatCell level={s.level} className="size-3" aria-hidden="true" />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function describe(d: HeatDay, today: ISODate) {
  const day = formatDay(d.date, "medium");
  if (d.date > today) return `${day}: upcoming`;
  if (d.eligible === 0) return `${day}: nothing scheduled`;
  return `${day}: ${d.completed} of ${d.eligible} done (${Math.round((d.completed / d.eligible) * 100)}%)`;
}

/** Weeks as columns, weekdays as rows: the shape people read a habit year in. */
export function RangeHeatmap({ days, today, weekStartsOn }: { days: HeatDay[]; today: ISODate; weekStartsOn: number }) {
  if (days.length === 0) return null;
  const first = startOfWeek(days[0].date, weekStartsOn);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weeks: (HeatDay | null)[][] = [];
  for (let s = first; s <= days[days.length - 1].date; s = addDays(s, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => byDate.get(addDays(s, i)) ?? null));
  }
  // Short ranges get larger squares so a month still reads as a calendar, not a speck.
  const cell = weeks.length <= 8 ? 30 : weeks.length <= 20 ? 20 : 14;
  const rowLabels = Array.from({ length: 7 }, (_, i) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][(weekStartsOn + i) % 7]);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-grid grid-flow-col gap-1" style={{ gridTemplateRows: `repeat(7, ${cell}px)` }}>
        {rowLabels.map((l, i) => (
          <span key={l} className="flex items-center pr-1.5 text-[11px] text-muted-foreground" style={{ gridRow: i + 1, gridColumn: 1 }}>
            {cell >= 20 || i % 2 === 0 ? l : ""}
          </span>
        ))}
        {weeks.map((w, wi) =>
          w.map((d, di) =>
            d ? (
              <HeatCell
                key={d.date}
                level={heatLevel(d, today)}
                style={{ gridRow: di + 1, gridColumn: wi + 2, width: cell, height: cell }}
                title={describe(d, today)}
                aria-label={describe(d, today)}
                role="img"
              />
            ) : (
              <span key={`${wi}-${di}`} style={{ gridRow: di + 1, gridColumn: wi + 2 }} />
            ),
          ),
        )}
      </div>
    </div>
  );
}

