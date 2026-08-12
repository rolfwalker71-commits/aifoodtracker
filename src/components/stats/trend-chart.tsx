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
import { nutrientLabel } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";

type Point = {
  label: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
};

type Props = {
  data: Point[];
  metric: keyof Omit<Point, "label">;
  color?: string;
  unit?: string;
};

export function TrendChart({
  data,
  metric,
  color = "#0f766e",
  unit = "",
}: Props) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Keine Daten im gewählten Zeitraum
      </div>
    );
  }

  const digits = metric === "calories" || metric === "sodium" ? 0 : 1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={44}
            tickFormatter={(value) => formatNumber(Number(value), digits)}
          />
          <Tooltip
            formatter={(value) => [
              `${formatNumber(Number(value), digits)}${unit}`,
              nutrientLabel(metric),
            ]}
            labelFormatter={(label) => String(label)}
          />
          <Area
            type="monotone"
            dataKey={metric}
            name={nutrientLabel(metric)}
            stroke={color}
            fill="url(#metricFill)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
