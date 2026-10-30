"use client";

import { useId, useState } from "react";
import { StatusPill } from "@/components/status-pill";

const TARGET = 60;

const pctText = (p: number) => `${Math.round(p)}%`;

/** The hero's live fragment: one habit row from Today. Drag to record minutes and watch partial progress count. */
export function ProgressDemo() {
  const id = useId();
  const [minutes, setMinutes] = useState(35);
  const pct = Math.min(100, (minutes / TARGET) * 100);
  const done = minutes >= TARGET;

  return (
    <div data-ui className="flex h-full flex-col justify-between gap-5 rounded-[14px] bg-background p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="size-2.5 rounded-full bg-data" aria-hidden="true" />
        <span className="text-base font-medium">Study</span>
        <span className="text-sm text-muted-foreground">Target 60 min</span>
        <span className="ml-auto">
          {done ? (
            <StatusPill tone="positive">Done</StatusPill>
          ) : minutes > 0 ? (
            <StatusPill tone="progress">{pctText(pct)} done</StatusPill>
          ) : (
            <StatusPill tone="neutral">Not started</StatusPill>
          )}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-sm text-muted-foreground">
            Drag to record your minutes
          </label>
          <span className="num text-2xl whitespace-nowrap">
            {minutes}
            <span className="text-base text-muted-foreground"> / {TARGET} min</span>
          </span>
        </div>
        {/* One bar that is also the control: a native range input lies invisibly over it, so keyboard,
            touch and screen readers all work, and the visible knob follows its value. */}
        <div className="group relative mt-4 h-8">
          {/* The bar runs 0–90 min so going past the target is visible; the line marks the 60-min target. */}
          <div className="absolute inset-x-[14px] top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
            {/* On load the bar fills to 35 minutes and the knob slides with it (globals.css). */}
            <div className="anim-grow h-full rounded-full bg-data" style={{ width: `${(minutes / 90) * 100}%`, "--d": "550ms" } as React.CSSProperties} />
          </div>
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-0.5 rounded-full bg-foreground/60"
            style={{ left: `calc(14px + (100% - 28px) * ${TARGET / 90})` }}
          />
          <span
            aria-hidden="true"
            className="anim-knob absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-data bg-background ring-offset-2 ring-offset-background transition-transform group-active:scale-110 group-has-[input:focus-visible]:scale-110 group-has-[input:focus-visible]:ring-4 group-has-[input:focus-visible]:ring-ring"
            style={{ left: `calc(14px + (100% - 28px) * ${minutes / 90})`, "--d": "550ms" } as React.CSSProperties}
          />
          <input
            id={id}
            type="range"
            min={0}
            max={90}
            step={5}
            value={minutes}
            aria-valuetext={`${minutes} of ${TARGET} minutes, ${pctText(pct)}`}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-grab opacity-0 active:cursor-grabbing"
          />
        </div>
      </div>

      <div className="relative -mt-3 h-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="absolute -translate-x-1/2" style={{ left: `calc(14px + (100% - 28px) * ${TARGET / 90})` }}>
          Target
        </span>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {done
          ? minutes > TARGET
            ? `Target met, and all ${minutes} minutes stay in your history.`
            : "Target met."
          : minutes === 0
            ? "Nothing recorded yet."
            : `Most trackers call this a miss. Ascend counts it as ${pctText(pct)}.`}
      </p>
    </div>
  );
}
