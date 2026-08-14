"use client";

import { useEffect, useState } from "react";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { MacroChart } from "@/components/dashboard/macro-chart";
import { TrendChart } from "@/components/stats/trend-chart";
import { WeightTrend } from "@/components/weight/weight-trend";
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
import type { NutrientTotals, NutritionGoals } from "@/lib/nutrition";

type StatsResponse = {
  mealCount: number;
  totals: NutrientTotals;
  averages: NutrientTotals;
  goals: NutritionGoals;
  series: Array<{ label: string } & Partial<NutrientTotals>>;
};

type MetricKey =
  | "calories"
  | "protein"
  | "fiber"
  | "sugar"
  | "sodium"
  | "potassium"
  | "vitaminC"
  | "calcium"
  | "iron";

export default function StatsPage() {
  const [range, setRange] = useState<StatsRange>("week");
  const [metric, setMetric] = useState<MetricKey>("calories");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [weight, setWeight] = useState<Array<{ recordedOn: string; kg: number }>>(
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [statsRes, weightRes] = await Promise.all([
        fetch(`/api/stats?range=${range}`, { cache: "no-store" }),
        fetch("/api/weight", { cache: "no-store" }),
      ]);
      const data = await statsRes.json();
      const weightData = await weightRes.json().catch(() => ({}));
      if (!cancelled && statsRes.ok) setStats(data);
      if (!cancelled && weightRes.ok) setWeight(weightData.entries || []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
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
                    <p className="font-display text-2xl font-bold">
                      {stats.mealCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">
                      Ø Kalorien / Tag
                    </p>
                    <p className="font-display text-2xl font-bold">
                      {formatNumber(stats.averages.calories)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">
                      Ø Protein / Tag
                    </p>
                    <p className="font-display text-2xl font-bold">
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
                    onValueChange={(value) => setMetric(value as MetricKey)}
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
                      <SelectItem value="potassium">Kalium</SelectItem>
                      <SelectItem value="vitaminC">Vitamin C</SelectItem>
                      <SelectItem value="calcium">Kalzium</SelectItem>
                      <SelectItem value="iron">Eisen</SelectItem>
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
                        : metric === "sodium" ||
                            metric === "potassium" ||
                            metric === "calcium" ||
                            metric === "vitaminC"
                          ? " mg"
                          : metric === "iron"
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

              <Card>
                <CardHeader>
                  <CardTitle>Gewicht</CardTitle>
                </CardHeader>
                <CardContent>
                  <WeightTrend data={weight} />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Makros (Ø/Tag)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NutrientProgress
                      label="Kalorien"
                      current={stats.averages.calories}
                      goal={stats.goals.dailyCaloriesGoal}
                      unit="kcal"
                    />
                    <NutrientProgress
                      label="Protein"
                      current={stats.averages.protein}
                      goal={stats.goals.dailyProteinGoal}
                    />
                    <NutrientProgress
                      label="Kohlenhydrate"
                      current={stats.averages.carbs}
                      goal={stats.goals.dailyCarbsGoal}
                      colorClass="bg-cyan-600"
                    />
                    <NutrientProgress
                      label="Fett"
                      current={stats.averages.fat}
                      goal={stats.goals.dailyFatGoal}
                      colorClass="bg-orange-600"
                    />
                    <NutrientProgress
                      label="Ballaststoffe"
                      current={stats.averages.fiber}
                      goal={stats.goals.dailyFiberGoal}
                      colorClass="bg-emerald-700"
                    />
                    <NutrientProgress
                      label="Zucker"
                      current={stats.averages.sugar}
                      goal={stats.goals.dailySugarGoal}
                      colorClass="bg-amber-600"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mikronährstoffe (Ø/Tag)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NutrientProgress
                      label="Natrium"
                      current={stats.averages.sodium}
                      goal={stats.goals.dailySodiumGoal}
                      unit="mg"
                      colorClass="bg-sky-700"
                    />
                    <NutrientProgress
                      label="Kalium"
                      current={stats.averages.potassium}
                      goal={stats.goals.dailyPotassiumGoal}
                      unit="mg"
                      colorClass="bg-violet-600"
                    />
                    <NutrientProgress
                      label="Vitamin A"
                      current={stats.averages.vitaminA}
                      goal={stats.goals.dailyVitaminAGoal}
                      unit="µg"
                      colorClass="bg-amber-600"
                    />
                    <NutrientProgress
                      label="Vitamin C"
                      current={stats.averages.vitaminC}
                      goal={stats.goals.dailyVitaminCGoal}
                      unit="mg"
                      colorClass="bg-lime-600"
                    />
                    <NutrientProgress
                      label="Vitamin D"
                      current={stats.averages.vitaminD}
                      goal={stats.goals.dailyVitaminDGoal}
                      unit="µg"
                      colorClass="bg-yellow-600"
                    />
                    <NutrientProgress
                      label="Kalzium"
                      current={stats.averages.calcium}
                      goal={stats.goals.dailyCalciumGoal}
                      unit="mg"
                      colorClass="bg-stone-600"
                    />
                    <NutrientProgress
                      label="Eisen"
                      current={stats.averages.iron}
                      goal={stats.goals.dailyIronGoal}
                      unit="mg"
                      colorClass="bg-red-700"
                    />
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
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
