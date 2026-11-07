"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GlassWater, Minus, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addWater, logWeight } from "@/app/(app)/nutrition/actions";
import type { ISODate } from "@/lib/domain/dates";
import { formatDay } from "@/lib/format";

/** Water for the day: a glass at a time, toward the daily goal. */
export function WaterCard({ date, ml, target }: { date: ISODate; ml: number; target: number }) {
  const [pending, start] = useTransition();
  const change = (delta: number) => start(async () => {
    const res = await addWater(date, delta);
    if (!res.ok) toast.error(res.error);
  });
  const share = Math.min(1, ml / target);
  return (
    <section aria-labelledby="water-title" className="grid gap-3 rounded-2xl bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="water-title" className="flex items-center gap-2 font-medium"><GlassWater className="size-4 text-muted-foreground" aria-hidden="true" /> Water</h2>
        <span className="num">{(ml / 1000).toFixed(2).replace(/0$/, "")} <span className="text-sm text-muted-foreground">/ {(target / 1000).toFixed(2).replace(/0$/, "")} L</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-data-track" aria-hidden="true"><div className="h-full rounded-full bg-[var(--habit-sky)]" style={{ width: `${share * 100}%` }} /></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => change(250)}><Plus /> Glass (250 ml)</Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => change(500)}><Plus /> Bottle (500 ml)</Button>
        <Button variant="ghost" size="sm" disabled={pending || ml === 0} onClick={() => change(-250)} aria-label="Remove 250 ml"><Minus /> 250 ml</Button>
      </div>
    </section>
  );
}

/** Today's weight, with the change since the previous weigh-in. */
export function WeightCard({ date, today, latest }: { date: ISODate; today: ISODate; latest: { date: string; kg: number }[] }) {
  const onDay = latest.find((w) => w.date === date);
  const before = latest.find((w) => w.date < date);
  const [kg, setKg] = useState(onDay ? String(onDay.kg) : "");
  const [pending, start] = useTransition();
  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await logWeight({ date, kg: Number(kg.replace(",", ".")) });
      if (res.ok) toast.success(date === today ? "Weight saved. Your targets use it from now on." : "Weight saved");
      else toast.error(res.error);
    });
  }
  const diff = onDay && before ? Math.round((onDay.kg - before.kg) * 10) / 10 : null;
  return (
    <section aria-labelledby="weight-title" className="grid gap-3 rounded-2xl bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="weight-title" className="flex items-center gap-2 font-medium"><Scale className="size-4 text-muted-foreground" aria-hidden="true" /> Body weight</h2>
        {diff !== null && <span className="num text-sm text-muted-foreground">{diff > 0 ? "+" : diff < 0 ? "−" : ""}{Math.abs(diff)} kg since {formatDay(before!.date, "short")}</span>}
      </div>
      <form onSubmit={save} className="flex items-center gap-2">
        <Input aria-label="Weight in kilograms" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={before ? String(before.kg) : "70"} className="num w-28" />
        <span className="text-muted-foreground">kg</span>
        <Button type="submit" variant="secondary" disabled={pending || !kg}>{pending ? "Saving…" : onDay ? "Update" : "Save"}</Button>
      </form>
    </section>
  );
}
