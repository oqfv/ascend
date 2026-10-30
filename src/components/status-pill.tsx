import { cn } from "@/lib/utils";

const STYLES = {
  positive: "bg-pill-positive text-pill-positive-ink",
  negative: "bg-pill-negative text-pill-negative-ink",
  warning: "bg-pill-warning text-pill-warning-ink",
  neutral: "bg-pill-neutral text-pill-neutral-ink",
  progress: "bg-pill-progress text-pill-progress-ink",
} as const;

export function StatusPill({ tone, children, className }: { tone: keyof typeof STYLES; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 flex-none items-center rounded-full px-2 text-xs font-medium whitespace-nowrap", STYLES[tone], className)}>
      {children}
    </span>
  );
}
