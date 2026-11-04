"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TooltipBox } from "@/components/charts/chart-frame";
import { formatDay } from "@/lib/format";
import type { SessionSummary } from "@/lib/domain/workouts";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

/** Top weight per session (or top reps for bodyweight exercises), oldest to newest. */
export function ExerciseChart({ sessions, measure }: { sessions: SessionSummary[]; measure: "weight" | "reps" }) {
  const rows = sessions.map((s) => ({ x: formatDay(s.date, "short"), full: formatDay(s.date), v: measure === "weight" ? s.topWeightKg : s.topReps }));
  const unit = measure === "weight" ? "kg" : "reps";
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--control)" }} minTickGap={24} interval="preserveStartEnd" />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            // Whole numbers with a little room above and below the line.
            domain={[(min: number) => Math.max(0, Math.floor(min * 0.9)), (max: number) => Math.ceil(max * 1.05)]}
          />
          <Tooltip
            cursor={{ stroke: "var(--control)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <TooltipBox
                  title={payload[0].payload.full}
                  lines={[{ label: measure === "weight" ? "Top weight" : "Most reps", value: `${payload[0].payload.v} ${unit}` }]}
                />
              ) : null
            }
          />
          <Line type="monotone" dataKey="v" stroke="var(--data)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--data)" }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
