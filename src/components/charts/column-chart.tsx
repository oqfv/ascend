"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TooltipBox } from "./chart-frame";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

export interface Column {
  x: string;
  title: string;
  value: number | null;
  lines: { label: string; value: string }[];
}

const FORMATS = {
  percent: (v: number) => `${v}%`,
  minutes: (v: number) => (v >= 120 && v % 60 === 0 ? `${v / 60} h` : `${Math.round(v)}`),
  count: (v: number) => `${Math.round(v)}`,
};

/** Columns on one zero-based axis. Square bottoms on the baseline, 4px top radius, no animation. */
export function ColumnChart({
  data,
  unit,
  height = 200,
}: {
  data: Column[];
  unit: keyof typeof FORMATS;
  height?: number;
}) {
  const percent = unit === "percent";
  const format = FORMATS[unit];
  const max = Math.max(0, ...data.map((d) => d.value ?? 0));
  const top = percent ? 100 : niceCeil(max);
  const ticks = percent ? [0, 25, 50, 75, 100] : [0, top / 4, top / 2, (top * 3) / 4, top];
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--control)" }} minTickGap={16} interval="preserveStartEnd" />
          <YAxis domain={[0, top]} ticks={ticks} tickFormatter={format} tick={AXIS} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            cursor={{ fill: "var(--accent)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const c = payload[0].payload as Column;
              return <TooltipBox title={c.title} lines={c.lines} />;
            }}
          />
          <Bar dataKey="value" fill="var(--data)" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A round top tick above the maximum: 0–60 by 15, 0–200 by 50. */
function niceCeil(v: number): number {
  if (v <= 0) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 4, 5, 10]) {
    const top = m * step;
    if (top >= v * 1.05) return top;
  }
  return 10 * step;
}
