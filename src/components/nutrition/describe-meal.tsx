"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addFood, describeMeal } from "@/app/(app)/nutrition/actions";
import { portion, sumMacros } from "@/lib/domain/nutrition";
import type { MealItem } from "@/lib/meal-text";
import type { ISODate } from "@/lib/domain/dates";

type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type Row = MealItem & { keep: boolean; gramsText: string };

const n = (s: string) => Number(s.replace(",", "."));

/** Describe a meal in words; check each item's grams, then add them all. */
export function DescribeMeal({ date, meal, mealLabel, onDone }: { date: ISODate; meal: Meal; mealLabel: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [pending, start] = useTransition();
  const kept = (rows ?? []).filter((r) => r.keep && n(r.gramsText) > 0);
  const total = sumMacros(kept.map((r) => portion(r.per100, n(r.gramsText))));

  function lookUp(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await describeMeal(text);
      if (res.ok) setRows(res.items.map((i) => ({ ...i, keep: true, gramsText: String(i.grams) })));
      else toast.error(res.error);
    });
  }

  function addAll() {
    start(async () => {
      for (const r of kept) {
        const res = await addFood({ date, meal, name: r.name, grams: n(r.gramsText), per100: r.per100, source: "ninjas" });
        if (!res.ok) { toast.error(res.error); return; }
      }
      toast.success(`Added ${kept.length} ${kept.length === 1 ? "item" : "items"} to ${mealLabel.toLowerCase()}`);
      onDone();
    });
  }

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs && rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="grid gap-4">
      <form onSubmit={lookUp} className="grid gap-3">
        <Textarea aria-label="Describe what you ate" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={2} placeholder="2 eggs, a slice of toast and a coffee with milk" autoFocus />
        <div>
          <Button type="submit" disabled={pending || text.trim().length < 3}>{pending && !rows ? "Looking up…" : "Look it up"}</Button>
        </div>
      </form>
      {rows && (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">Check the grams. When you don&apos;t give an amount, the lookup often assumes 100 g.</p>
          <ul className="grid gap-2">
            {rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface px-3 py-2">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="checkbox" checked={r.keep} onChange={(e) => set(i, { keep: e.target.checked })} className="size-4 accent-[var(--data)]" />
                  <span className="truncate">{r.name}</span>
                </label>
                <span className="flex items-center gap-1.5">
                  <Input aria-label={`Grams of ${r.name}`} inputMode="decimal" value={r.gramsText} onChange={(e) => set(i, { gramsText: e.target.value })} className="num h-9 w-20" />
                  <span className="text-sm text-muted-foreground">g</span>
                </span>
                <span className="num w-20 text-right text-sm">{n(r.gramsText) > 0 ? `${portion(r.per100, n(r.gramsText)).calories} kcal` : "–"}</span>
              </li>
            ))}
          </ul>
          <p className="num rounded-lg bg-surface px-3 py-2">
            Total: {Math.round(total.calories)} kcal · P {Math.round(total.protein)} g · C {Math.round(total.carbs)} g · F {Math.round(total.fat)} g
          </p>
          <div>
            <Button onClick={addAll} disabled={pending || kept.length === 0}>{pending ? "Adding…" : `Add to ${mealLabel.toLowerCase()}`}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Values come from CalorieNinjas. Only the words you typed are sent to them.</p>
        </div>
      )}
    </div>
  );
}
