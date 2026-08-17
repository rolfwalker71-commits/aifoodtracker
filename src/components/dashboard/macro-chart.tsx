"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatNumber } from "@/lib/utils";

type Props = {
  protein: number;
  carbs: number;
  fat: number;
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function MacroChart({ protein, carbs, fat }: Props) {
  const data = [
    { name: "Protein", value: Math.max(protein, 0) },
    { name: "Kohlenhydrate", value: Math.max(carbs, 0) },
    { name: "Fett", value: Math.max(fat, 0) },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Noch keine Makros für den Zeitraum
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatNumber(Number(value), 1)} g`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
