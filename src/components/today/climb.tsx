import type { DayItem } from "@/lib/data/day";
import { cn } from "@/lib/utils";

/**
 * Today's climb: one segment per scheduled occurrence, each filled to its real progress.
 * Partial work shows as a partly filled step instead of disappearing into "not done".
 */
export function Climb({ items, className }: { items: DayItem[]; className?: string }) {
  const steps = items.filter((i) => i.kind === "day");
  if (steps.length === 0) return null;
  const done = steps.filter((s) => s.complete).length;
  const partial = steps.filter((s) => !s.complete && s.progress > 0).length;
  return (
    <div
      role="img"
      aria-label={`${done} of ${steps.length} complete${partial ? `, ${partial} partly done` : ""}`}
      className={cn("flex h-3 gap-1", className)}
    >
      {steps.map((s) => (
        <span key={s.key} className="relative flex-1 overflow-hidden rounded-full bg-data-track" title={s.name}>
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-data transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(s.progress * 100)}%` }}
          />
        </span>
      ))}
    </div>
  );
}
