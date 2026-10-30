import { Check } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { CountUp } from "@/components/motion/in-view";
import { cn } from "@/lib/utils";

// Small, real-size pieces of the app, drawn in HTML with the app's own tokens. Each one proves
// a single claim on the front page; the numbers inside each add up. Their .iv-* classes play when
// the feature row around them scrolls into view.

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div data-ui className={cn("rounded-[14px] bg-background p-5 text-base sm:p-8 sm:text-lg", className)}>{children}</div>;
}

function Done({ small }: { small?: boolean }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-data text-white dark:text-[#0b1a18]", small ? "size-6" : "size-7")}>
      <Check className={small ? "size-3.5" : "size-4"} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

function Open({ small }: { small?: boolean }) {
  return <span className={cn("shrink-0 rounded-full border-[1.5px] border-control", small ? "size-6" : "size-7")} />;
}

/** Gym with three steps: cardio done, weights part way, stretching optional. 1 of 2 required steps done. */
export function StepsFragment() {
  return (
    <Frame>
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: "var(--data)" }} aria-hidden="true" />
        <span className="font-medium">Gym</span>
        <span className="text-[15px] sm:text-base text-muted-foreground">1 of 2 steps</span>
        <StatusPill tone="progress" className="ml-auto">
          72% done
        </StatusPill>
      </div>
      <ul className="mt-4 grid gap-3 border-l-2 border-rule pl-4">
        <li className="iv-rise flex items-center gap-3" style={delay(350)}>
          <Done small />
          <span className="flex-1">Cardio</span>
          <span className="num text-[15px] sm:text-base text-muted-foreground">30 / 30 min</span>
        </li>
        <li className="iv-rise flex items-center gap-3" style={delay(480)}>
          <Open small />
          <span className="flex-1">Weight training</span>
          <span className="num text-[15px] sm:text-base text-muted-foreground">20 / 45 min</span>
        </li>
        <li className="iv-rise flex items-center gap-3" style={delay(610)}>
          <Open small />
          <span className="flex-1">
            Stretching <span className="text-muted-foreground">· optional</span>
          </span>
        </li>
      </ul>
    </Frame>
  );
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Run three times a week: Monday and Thursday done, Friday today, two days left after it. */
export function TargetFragment() {
  const done = new Set([0, 3]);
  return (
    <Frame>
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: "var(--habit-slate)" }} aria-hidden="true" />
        <span className="font-medium">Run</span>
        <span className="text-[15px] sm:text-base text-muted-foreground">3 times a week</span>
        <StatusPill tone="neutral" className="ml-auto">
          On the way
        </StatusPill>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
        <div className="iv-fill h-full w-2/3 rounded-full bg-data" style={delay(400)} />
      </div>
      <p className="num mt-2 text-[15px] sm:text-base text-muted-foreground">2 of 3 sessions this week · 3 days left</p>
      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="This week">
        {WEEK.map((d, i) => (
          <li key={d} className="grid justify-items-center gap-1.5">
            <span className={cn("text-sm", i === 4 ? "font-medium text-foreground" : "text-muted-foreground")}>{d}</span>
            <span className="iv-pop grid" style={delay(500 + i * 70)}>
              {done.has(i) ? <Done small /> : <Open small />}
            </span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/** Read on weekdays only: the weekend is not scheduled, so the streak carries straight through it. */
export function StreakFragment() {
  const days = [
    { d: "Thu", s: "done" },
    { d: "Fri", s: "done" },
    { d: "Sat", s: "rest" },
    { d: "Sun", s: "rest" },
    { d: "Mon", s: "done" },
    { d: "Tue", s: "done" },
    { d: "Wed", s: "done" },
  ] as const;
  return (
    <Frame>
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: "var(--data)" }} aria-hidden="true" />
        <span className="font-medium">Read</span>
        <span className="text-[15px] sm:text-base text-muted-foreground">Weekdays</span>
        <span className="num ml-auto text-[15px] sm:text-base font-medium">5 days in a row</span>
      </div>
      <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Last seven days">
        {days.map((x, i) => (
          <li key={i} className="grid justify-items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{x.d}</span>
            <span className="iv-pop grid" style={delay(350 + i * 90)}>
              {x.s === "done" ? <Done /> : <span className="block size-7 rounded-full border-[1.5px] border-dashed border-control" />}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[15px] sm:text-base text-muted-foreground">Dashed days weren&apos;t planned, so they don&apos;t count against you.</p>
    </Frame>
  );
}

/** A weekly review written from the numbers. */
export function ReviewFragment() {
  return (
    <Frame>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">Your week</span>
        <span className="num text-3xl">
          <CountUp value={76} suffix="%" />
        </span>
      </div>
      <ul className="mt-4 grid list-disc gap-2 pl-5">
        <li className="iv-rise" style={delay(500)}>Read was your most consistent habit: 6 of 7 done.</li>
        <li className="iv-rise" style={delay(650)}>Run: target met, 3 of 3 sessions.</li>
        <li className="iv-rise" style={delay(800)}>Fridays are your hardest day: 50% done, against 76% on an average day.</li>
      </ul>
    </Frame>
  );
}
