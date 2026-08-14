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

  const points = data.map((row) => ({
    label: row.recordedOn.slice(8) + "." + row.recordedOn.slice(5, 7),
    kg: row.kg,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={44}
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(value) => formatNumber(Number(value), 1)}
          />
          <Tooltip
            formatter={(value) => [`${formatNumber(Number(value), 1)} kg`, "Gewicht"]}
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
