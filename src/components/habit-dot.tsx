import { cn } from "@/lib/utils";

/** The habit's identity colour as a small dot. Identity, not data: it never appears in charts. */
export function HabitDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: `var(--habit-${color ?? "ink"})` }}
    />
  );
}
