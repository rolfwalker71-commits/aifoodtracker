"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "@/lib/utils";

export function WeightTrend({
  data,
}: {
  data: Array<{ recordedOn: string; kg: number }>;
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch zu wenig Einträge für einen Verlauf.
      </p>
    );
  }

  const points = data.map((row) => {
    const time = Date.parse(`${row.recordedOn}T12:00:00.000Z`);
    return {
      time,
      kg: row.kg,
      label: row.recordedOn.slice(8) + "." + row.recordedOn.slice(5, 7),
    };
  });

  const minTime = points[0]!.time;
  const maxTime = points[points.length - 1]!.time;
  const span = Math.max(maxTime - minTime, 1);
  // Aim for ~4–6 ticks across the horizontal time axis
  const tickCount = Math.min(6, Math.max(3, points.length));
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round(minTime + (span * i) / (tickCount - 1)),
  );

  function formatTick(value: number) {
    const date = new Date(value);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${day}.${month}`;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tick={{ fontSize: 12 }}
            tickFormatter={formatTick}
            scale="time"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            width={44}
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(value) => formatNumber(Number(value), 1)}
          />
          <Tooltip
            labelFormatter={(value) => formatTick(Number(value))}
            formatter={(value) => [
              `${formatNumber(Number(value), 1)} kg`,
              "Gewicht",
            ]}
          />
          <Area
            type="monotone"
            dataKey="kg"
            stroke="#0f766e"
            fill="url(#weightFill)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
