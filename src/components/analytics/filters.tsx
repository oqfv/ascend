"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, Segmented } from "@/components/controls";
import { RANGES, type RangeKey } from "@/lib/analytics-range";


/** One row of controls that scopes every chart below it. All state lives in the URL. */
export function AnalyticsFilters({
  range,
  from,
  to,
  habitId,
  categoryId,
  compare,
  habits,
  categories,
}: {
  range: RangeKey;
  from: string;
  to: string;
  habitId: string | null;
  categoryId: string | null;
  compare: boolean;
  habits: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [custom, setCustom] = useState({ from, to });

  function set(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    router.push(`/analytics?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Date range"
          value={range}
          options={[...RANGES]}
          onChange={(r) => (r === "custom" ? set({ range: "custom", from: custom.from, to: custom.to }) : set({ range: r, from: null, to: null }))}
        />
        <NativeSelect aria-label="Habit" value={habitId ?? ""} onChange={(e) => set({ habit: e.target.value })} className="w-full sm:w-52">
          <option value="">All habits</option>
          {habits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Category" value={categoryId ?? ""} onChange={(e) => set({ category: e.target.value })} className="w-full sm:w-48">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={compare} onCheckedChange={(v) => set({ compare: v ? null : "0" })} />
          Compare with previous period
        </label>
      </div>
      {range === "custom" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ range: "custom", from: custom.from, to: custom.to });
          }}
        >
          <label className="grid gap-1 text-sm">
            From
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-44" />
          </label>
          <label className="grid gap-1 text-sm">
            To
            <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-44" />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
