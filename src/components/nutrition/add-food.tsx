"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Segmented } from "@/components/controls";
import { addFood, searchFood } from "@/app/(app)/nutrition/actions";
import { portion, type Macros } from "@/lib/domain/nutrition";
import type { FoodResult } from "@/lib/food-search";
import type { RecentFood } from "@/lib/data/nutrition";
import type { ISODate } from "@/lib/domain/dates";

type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type Picked = { name: string; brand: string | null; source: "off" | "usda" | "manual"; sourceId: string | null; per100: Macros };

const fmt = (m: Macros) => `${Math.round(m.calories)} kcal · P ${m.protein} g · C ${m.carbs} g · F ${m.fat} g`;
const n = (s: string) => Number(s.replace(",", "."));

/** Add a food to one meal: search the databases, re-add a recent food, or type it in. */
export function AddFood({ date, meal, mealLabel, recent }: { date: ISODate; meal: Meal; mealLabel: string; recent: RecentFood[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodResult[] | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [grams, setGrams] = useState("100");
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [pending, start] = useTransition();

  const reset = () => { setPicked(null); setResults(null); setQ(""); setGrams("100"); setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" }); };
  const done = (res: { ok: boolean; error?: string }) => {
    if (res.ok) { toast.success(`Added to ${mealLabel.toLowerCase()}`); reset(); setOpen(false); }
    else toast.error(res.error);
  };

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await searchFood(q);
      if (!res.ok) { toast.error(res.error); return; }
      setResults(res.results);
      if (res.partial) toast.message("One food database didn't answer, so results may be incomplete.");
    });
  }

  function addPicked(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    start(async () => done(await addFood({ date, meal, name: picked.name, brand: picked.brand, grams: n(grams), per100: picked.per100, source: picked.source, sourceId: picked.sourceId })));
  }

  function addRecent(r: RecentFood) {
    if (r.per100) { setPicked({ name: r.name, brand: r.brand, source: r.source === "usda" || r.source === "off" ? r.source : "manual", sourceId: r.sourceId, per100: r.per100 }); setGrams(String(r.grams ?? 100)); return; }
    start(async () => done(await addFood({ date, meal, name: r.name, brand: r.brand, grams: r.grams, totals: r.totals, source: "manual" })));
  }

  function addManual(e: React.FormEvent) {
    e.preventDefault();
    start(async () =>
      done(await addFood({ date, meal, name: manual.name, totals: { calories: n(manual.calories || "0"), protein: n(manual.protein || "0"), carbs: n(manual.carbs || "0"), fat: n(manual.fat || "0") }, source: "manual" })),
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="justify-self-start">
        <Plus /> Add food
      </Button>
    );
  }

  return (
    <div className="grid gap-4 rounded-xl bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="How to add" value={tab} onChange={(t) => { setTab(t); setPicked(null); }} options={[{ value: "search", label: "Search" }, { value: "manual", label: "Type it in" }]} />
        <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</Button>
      </div>

      {tab === "search" && !picked && (
        <>
          <form onSubmit={runSearch} className="flex gap-2">
            <Input aria-label="Search for a food" placeholder="Rice, chicken breast, labneh…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} autoFocus />
            <Button type="submit" disabled={pending || q.trim().length < 2}>
              <Search /> {pending ? "Searching…" : "Search"}
            </Button>
          </form>
          {recent.length > 0 && !results && (
            <div>
              <p className="text-sm text-muted-foreground">Recent</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={`${r.name}|${r.brand}`} type="button" onClick={() => addRecent(r)} disabled={pending} className="rounded-full bg-surface-strong px-3 py-1.5 text-sm hover:bg-accent">
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {results && (
            results.length === 0 ? (
              <p className="text-muted-foreground">Nothing found. Try another word, or type it in yourself.</p>
            ) : (
              <ul className="grid max-h-80 gap-1 overflow-auto">
                {results.map((r) => (
                  <li key={`${r.source}-${r.sourceId}`}>
                    <button type="button" onClick={() => { setPicked({ ...r, sourceId: r.sourceId }); setGrams("100"); }} className="grid w-full gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent">
                      <span className="font-medium">{r.name}{r.brand ? <span className="font-normal text-muted-foreground"> · {r.brand}</span> : null}</span>
                      <span className="num text-sm text-muted-foreground">Per 100 g: {fmt(r.per100)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          <p className="text-xs text-muted-foreground">Values come from Open Food Facts and USDA FoodData Central. Only your search words are sent to them.</p>
        </>
      )}

      {tab === "search" && picked && (
        <form onSubmit={addPicked} className="grid gap-4">
          <div>
            <p className="font-medium">{picked.name}{picked.brand ? <span className="font-normal text-muted-foreground"> · {picked.brand}</span> : null}</p>
            <p className="num text-sm text-muted-foreground">Per 100 g: {fmt(picked.per100)}</p>
          </div>
          <Field label="How much (grams)">{(p) => <Input {...p} inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="num w-40" autoFocus />}</Field>
          {n(grams) > 0 && <p className="num rounded-lg bg-surface px-3 py-2">{fmt(portion(picked.per100, n(grams)))}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || !(n(grams) > 0)}>{pending ? "Adding…" : `Add to ${mealLabel.toLowerCase()}`}</Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Back to results</Button>
          </div>
        </form>
      )}

      {tab === "manual" && (
        <form onSubmit={addManual} className="grid gap-4">
          <Field label="Food">{(p) => <Input {...p} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} maxLength={120} placeholder="Mum's chicken biryani" autoFocus />}</Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
              <Field key={k} label={k === "calories" ? "Calories (kcal)" : `${k[0].toUpperCase()}${k.slice(1)} (g)`}>
                {(p) => <Input {...p} inputMode="decimal" value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className="num" />}
              </Field>
            ))}
          </div>
          <p className="-mt-1 text-sm text-muted-foreground">Enter the numbers for the whole portion you ate.</p>
          <div>
            <Button type="submit" disabled={pending || !manual.name.trim() || manual.calories === ""}>{pending ? "Adding…" : `Add to ${mealLabel.toLowerCase()}`}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
