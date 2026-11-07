"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Repeat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setLinkedHabit } from "@/app/(app)/nutrition/actions";

type Key = "WATER" | "PROTEIN" | "ON_TARGET";

const ROWS: { key: Key; name: string; text: string; needsTargets: boolean }[] = [
  { key: "WATER", name: "Drink water", text: "Fills in as you add glasses and bottles.", needsTargets: false },
  { key: "PROTEIN", name: "Hit my protein", text: "Counts the protein in the food you log.", needsTargets: true },
  { key: "ON_TARGET", name: "Eat on target", text: "Ticks when calories are within 10% of your target and you reach your protein.", needsTargets: true },
];

/** Habits that tick themselves from what's logged here. They show on Today like any other habit. */
export function LinkedHabits({ on, hasTargets }: { on: Record<Key, boolean>; hasTargets: boolean }) {
  const [state, setState] = useOptimistic(on, (s, [k, v]: [Key, boolean]) => ({ ...s, [k]: v }));
  const [pending, start] = useTransition();

  function toggle(key: Key, value: boolean, name: string) {
    start(async () => {
      setState([key, value]);
      const res = await setLinkedHabit(key, value);
      if (!res.ok) toast.error(res.error);
      else toast.success(value ? `${name} is on your Today list` : `${name} turned off. Its history is kept.`);
    });
  }

  return (
    <section id="linked-habits" aria-labelledby="linked-title" className="grid gap-3 rounded-2xl bg-surface p-5">
      <div>
        <h2 id="linked-title" className="flex items-center gap-2 font-medium">
          <Repeat className="size-4 text-muted-foreground" aria-hidden="true" /> Habits that tick themselves
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Turn one on and it appears on Today, filled in from what you log here.</p>
      </div>
      <ul className="grid gap-1">
        {ROWS.map((r) => {
          const locked = r.needsTargets && !hasTargets;
          return (
            <li key={r.key} className="flex items-center gap-4 rounded-xl bg-background px-3 py-3">
              <div className="min-w-0 flex-1">
                <p id={`link-${r.key}`} className="font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">
                  {locked ? (
                    <>
                      Needs your targets first.{" "}
                      <Link href="/nutrition/welcome" className="font-medium text-foreground underline underline-offset-4">Work out my numbers</Link>
                    </>
                  ) : (
                    r.text
                  )}
                </p>
              </div>
              <Switch aria-labelledby={`link-${r.key}`} checked={state[r.key]} disabled={pending || (locked && !state[r.key])} onCheckedChange={(v) => toggle(r.key, v, r.name)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
