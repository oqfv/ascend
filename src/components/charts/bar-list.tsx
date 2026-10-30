import { cn } from "@/lib/utils";

export interface BarRow {
  key: string;
  label: string;
  sublabel?: string;
  /** 0–100, or null when nothing was due. */
  value: number | null;
  valueText: string;
  detail?: string;
  /** Marks the row the screen is about (e.g. the lowest performer) in ink instead of grey. */
  emphasis?: boolean;
}

/**
 * A ranked horizontal bar list. Long names wrap above their bar instead of being cut off,
 * values sit right-aligned in tabular figures, and "nothing due" prints as a dash.
 */
export function BarList({ rows, max = 100 }: { rows: BarRow[]; max?: number }) {
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1.5">
          <span className="min-w-0">
            <span className="block break-words">{r.label}</span>
            {r.sublabel && <span className="block text-xs text-muted-foreground">{r.sublabel}</span>}
          </span>
          <span className="num text-right">
            {r.valueText}
            {r.detail && <span className="block text-xs text-muted-foreground">{r.detail}</span>}
          </span>
          <span className="col-span-2 block h-2 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
            {r.value !== null && r.value > 0 && (
              <span
                className={cn("block h-full rounded-full", r.emphasis ? "bg-foreground" : "bg-data")}
                style={{ width: `${Math.max(1, Math.min(100, (r.value / max) * 100))}%` }}
              />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
