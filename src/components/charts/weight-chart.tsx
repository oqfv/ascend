"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay } from "@/lib/format";
import { TooltipBox } from "./chart-frame";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

/** Body weight over time. The axis hugs the values (not zero-based) so small changes are visible. */
export function WeightChart({ data, height = 200 }: { data: { date: string; kg: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, x: formatDay(d.date, "short") }));
  const lo = Math.floor(Math.min(...data.map((d) => d.kg)) - 1);
  const hi = Math.ceil(Math.max(...data.map((d) => d.kg)) + 1);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--control)" }} minTickGap={24} interval="preserveStartEnd" />
          <YAxis domain={[lo, hi]} allowDecimals={false} tickFormatter={(v) => `${v} kg`} tick={AXIS} tickLine={false} axisLine={false} width={60} />
          <Tooltip
            cursor={{ stroke: "var(--control)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { date: string; kg: number };
              return <TooltipBox title={formatDay(p.date, "medium")} lines={[{ label: "Weight", value: `${p.kg} kg` }]} />;
            }}
          />
          <Line
            dataKey="kg"
            stroke="var(--data)"
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 3, fill: "var(--data)", strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: "var(--data)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
