import { cn } from "@/lib/utils";

/**
 * A chart's panel: title, the one sentence it answers, its legend or period on the right,
 * and an optional table view so every value is readable without colour or hover.
 */
export function ChartFrame({
  title,
  summary,
  aside,
  table,
  className,
  children,
}: {
  title: string;
  summary?: React.ReactNode;
  aside?: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl bg-surface p-5", className)} aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
        </div>
        {aside && <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">{aside}</div>}
      </div>
      <div className="mt-4 min-w-0 flex-1">{children}</div>
      {table && (
        <details className="group mt-3">
          <summary className="w-fit cursor-pointer list-none rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show as table</span>
            <span className="hidden group-open:inline">Hide table</span>
          </summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-xl bg-background">{table}</div>
        </details>
      )}
    </section>
  );
}

export function LegendLine({ dashed, label }: { dashed?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="8" aria-hidden="true">
        <line x1="0" x2="18" y1="4" y2="4" stroke={dashed ? "var(--compare)" : "var(--data)"} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} />
      </svg>
      {label}
    </span>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-background">
        <tr className="text-xs text-muted-foreground">
          {head.map((h, i) => (
            <th key={h} className={cn("px-3 py-2 font-normal", i === 0 ? "text-left" : "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-rule">
            {r.map((c, j) => (
              <td key={j} className={cn("px-3 py-1.5", j === 0 ? "text-left" : "num text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tooltip box shared by every chart: bare, no arrow, label then values. */
export function TooltipBox({ title, lines }: { title: string; lines: { label: string; value: string; dashed?: boolean; muted?: boolean }[] }) {
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{title}</p>
      {lines.map((l) => (
        <p key={l.label} className={cn("num mt-0.5 flex items-center gap-2", l.muted && "text-muted-foreground")}>
          <span>{l.label}</span>
          <span className="ml-auto pl-4">{l.value}</span>
        </p>
      ))}
    </div>
  );
}
