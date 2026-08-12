"use client";

import { useEffect, useState } from "react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { MacroChart } from "@/components/dashboard/macro-chart";
import { TrendChart } from "@/components/stats/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";
import type { StatsRange } from "@/types/meals";

type StatsResponse = {
  mealCount: number;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    potassium: number;
  };
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    potassium: number;
  };
  goals: {
    dailyCaloriesGoal: number;
    dailyProteinGoal: number;
    dailyCarbsGoal: number;
    dailyFatGoal: number;
    dailyFiberGoal: number;
    dailySugarGoal: number;
    dailySodiumGoal: number;
    dailyPotassiumGoal: number;
  };
  series: Array<{
    label: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  }>;
};

export default function StatsPage() {
  const [range, setRange] = useState<StatsRange>("week");
  const [metric, setMetric] = useState<
    "calories" | "protein" | "fiber" | "sugar" | "sodium"
  >("calories");
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/stats?range=${range}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!cancelled && response.ok) setStats(data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Statistiken
        </h1>
        <p className="text-sm text-muted-foreground">
          Interaktive Auswertungen für Tag, Woche und Monat
        </p>
      </div>

      <Tabs value={range} onValueChange={(value) => setRange(value as StatsRange)}>
        <TabsList>
          <TabsTrigger value="day">Tag</TabsTrigger>
          <TabsTrigger value="week">Woche</TabsTrigger>
          <TabsTrigger value="month">Monat</TabsTrigger>
        </TabsList>

        <TabsContent value={range} className="space-y-4">
          {!stats ? (
            <p className="text-sm text-muted-foreground">Lade Statistiken…</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">Mahlzeiten</p>
                    <p className="font-display text-2xl font-semibold">
                      {stats.mealCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">
                      Ø Kalorien / Tag
                    </p>
                    <p className="font-display text-2xl font-semibold">
                      {formatNumber(stats.averages.calories)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">
                      Ø Protein / Tag
                    </p>
                    <p className="font-display text-2xl font-semibold">
                      {formatNumber(stats.averages.protein, 0)} g
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>Verlauf</CardTitle>
                  <Select
                    value={metric}
                    onValueChange={(value) =>
                      setMetric(
                        value as
                          | "calories"
                          | "protein"
                          | "fiber"
                          | "sugar"
                          | "sodium",
                      )
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calories">Kalorien</SelectItem>
                      <SelectItem value="protein">Protein</SelectItem>
                      <SelectItem value="fiber">Ballaststoffe</SelectItem>
                      <SelectItem value="sugar">Zucker</SelectItem>
                      <SelectItem value="sodium">Natrium</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    data={stats.series}
                    metric={metric}
                    unit={
                      metric === "calories"
                        ? " kcal"
                        : metric === "sodium"
                          ? " mg"
                          : " g"
                    }
                    color={
                      metric === "calories"
                        ? "#0f766e"
                        : metric === "protein"
                          ? "#0891b2"
                          : metric === "fiber"
                            ? "#15803d"
                            : metric === "sugar"
                              ? "#c2410c"
                              : "#0369a1"
                    }
                  />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Soll / Ist (Tagesziele)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NutrientProgress
                      label="Kalorien (Ø/Tag)"
                      current={stats.averages.calories}
                      goal={stats.goals.dailyCaloriesGoal}
                      unit="kcal"
                    />
                    <NutrientProgress
                      label="Protein (Ø/Tag)"
                      current={stats.averages.protein}
                      goal={stats.goals.dailyProteinGoal}
                    />
                    <NutrientProgress
                      label="Kohlenhydrate (Ø/Tag)"
                      current={stats.averages.carbs}
                      goal={stats.goals.dailyCarbsGoal}
                      colorClass="bg-cyan-600"
                    />
                    <NutrientProgress
                      label="Fett (Ø/Tag)"
                      current={stats.averages.fat}
                      goal={stats.goals.dailyFatGoal}
                      colorClass="bg-orange-600"
                    />
                    <NutrientProgress
                      label="Ballaststoffe (Ø/Tag)"
                      current={stats.averages.fiber}
                      goal={stats.goals.dailyFiberGoal}
                      colorClass="bg-emerald-700"
                    />
                    <NutrientProgress
                      label="Zucker (Ø/Tag)"
                      current={stats.averages.sugar}
                      goal={stats.goals.dailySugarGoal}
                      colorClass="bg-amber-600"
                    />
                    <NutrientProgress
                      label="Natrium (Ø/Tag)"
                      current={stats.averages.sodium}
                      goal={stats.goals.dailySodiumGoal}
                      unit="mg"
                      colorClass="bg-sky-700"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Makros im Zeitraum</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MacroChart
                      protein={stats.totals.protein}
                      carbs={stats.totals.carbs}
                      fat={stats.totals.fat}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
