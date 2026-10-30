"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AscendMark } from "@/components/brand";
import { finishTour } from "@/app/(app)/settings/actions";

// Shown once, right after sign-up. Every step can be skipped; Settings can start it again.

type Step = { title: string; body: React.ReactNode; art?: React.ReactNode };

const STEPS: Step[] = [
  {
    title: "Welcome to Ascend",
    body: "Here's how it works, in a few short steps. Skip whenever you like; you can watch it again from Settings.",
    art: <AscendMark partial animated className="size-16" />,
  },
  {
    title: "Add your habits",
    body: (
      <>
        Start with <b className="font-medium text-foreground">Add your first habit</b> on Today. After that, the{" "}
        <b className="font-medium text-foreground">Add a daily habit</b> box needs only a name. For targets, chosen days or steps like
        cardio and weights, open <b className="font-medium text-foreground">My habits</b>.
      </>
    ),
  },
  {
    title: "Record what you did",
    body: "Tick a habit off, or type how much you did. Part of a habit still counts: 35 of 60 minutes shows as 58% done, not a miss.",
    art: <PartialBar />,
  },
  {
    title: "Rest days are safe",
    body: "A day you didn't plan a habit never breaks its streak. Weekly and monthly targets count across the whole week or month.",
  },
  {
    title: "Look back",
    body: (
      <>
        <b className="font-medium text-foreground">Reviews</b> tells you what went up and what slipped each day, week and month, and
        holds your journal. <b className="font-medium text-foreground">Calendar</b> and{" "}
        <b className="font-medium text-foreground">Analytics</b> show every day at a glance and your trends over time.
      </>
    ),
  },
];

export function WelcomeTour({ hasEmail }: { hasEmail: boolean }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [report, setReport] = useState(false);
  const [pending, start] = useTransition();
  const last = step === STEPS.length; // the closing step, after the content steps
  const total = STEPS.length + 1;

  function close(withReport: boolean) {
    setOpen(false);
    start(() => finishTour(withReport));
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && close(false)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/25 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 grid w-[min(100%-2rem,440px)] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl bg-popover p-6 text-popover-foreground ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          {/* The step counter is itself a progress bar: the tour practises what it preaches. */}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-data-track" aria-hidden="true">
              <div className="h-full rounded-full bg-data transition-[width] duration-500 ease-out" style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
            <span className="num text-sm text-muted-foreground">
              {step + 1} of {total}
            </span>
          </div>

          <div key={step} className="tour-step grid gap-3">
            {last ? (
              <>
                <DialogPrimitive.Title className="text-2xl font-semibold tracking-[-0.02em]">You&apos;re set</DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-base text-muted-foreground">
                  One last choice. You can change it any time in Settings.
                </DialogPrimitive.Description>
                {hasEmail ? (
                  <label className="mt-1 flex items-start justify-between gap-4 rounded-xl bg-surface p-3.5">
                    <span>
                      <span className="block font-medium">Email me a monthly report</span>
                      <span className="block text-sm text-muted-foreground">
                        On the 1st of each month: how the month went, your best habit and longest streak. Unsubscribe in one click.
                      </span>
                    </span>
                    <Switch checked={report} onCheckedChange={setReport} aria-label="Email me a monthly report" />
                  </label>
                ) : (
                  <p className="rounded-xl bg-surface p-3.5 text-sm text-muted-foreground">
                    Want a monthly report by email? Add your email in{" "}
                    <Link href="/settings#email" className="font-medium text-foreground underline underline-offset-4" onClick={() => close(false)}>
                      Settings
                    </Link>{" "}
                    first.
                  </p>
                )}
              </>
            ) : (
              <>
                {STEPS[step].art && <div className="mb-1">{STEPS[step].art}</div>}
                <DialogPrimitive.Title className="text-2xl font-semibold tracking-[-0.02em]">{STEPS[step].title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-base leading-7 text-muted-foreground">{STEPS[step].body}</DialogPrimitive.Description>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {last ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => close(false)}>
                Skip tour
              </Button>
            )}
            <div className="flex gap-2">
              {step > 0 && !last && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {last ? (
                <Button onClick={() => close(report)} disabled={pending}>
                  Start using Ascend
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)} autoFocus>
                  {step === 0 ? "Show me" : "Next"}
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A one-line picture of partial credit: 35 of 60 minutes, 58% done. */
function PartialBar() {
  return (
    <div className="rounded-xl bg-surface p-3.5" aria-hidden="true">
      <div className="flex items-center gap-2 text-sm">
        <span className="size-2.5 rounded-full bg-data" />
        <span className="font-medium">Study</span>
        <span className="num ml-auto text-muted-foreground">35 / 60 min</span>
        <span className="rounded-full bg-pill-progress px-2 py-0.5 text-xs font-medium text-pill-progress-ink">58% done</span>
      </div>
      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-data-track">
        <div className="tour-fill h-full w-[58%] rounded-full bg-data" />
      </div>
    </div>
  );
}
