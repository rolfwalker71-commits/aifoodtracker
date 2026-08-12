import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { CoachTipCard } from "@/components/dashboard/coach-tip-card";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { PatternInsightsCard } from "@/components/dashboard/pattern-insights-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDailyCoachTip } from "@/lib/coach-tip";
import { getRangeBoundsInAppTz } from "@/lib/datetime";
import { detectMealPatterns } from "@/lib/insights";
import { formatNumber } from "@/lib/utils";
import { getStatsForUser } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date();
  const dayBounds = getRangeBoundsInAppTz("day", today);
  const weekBounds = getRangeBoundsInAppTz("week", today);

  const [dayStats, weekStats, dayMeals, weekMeals] = await Promise.all([
    getStatsForUser(session.user.id, "day"),
    getStatsForUser(session.user.id, "week"),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: dayBounds.from, lte: dayBounds.to },
      },
      orderBy: { consumedAt: "desc" },
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: weekBounds.from, lte: weekBounds.to },
      },
      orderBy: { consumedAt: "desc" },
      select: {
        name: true,
        mealType: true,
        calories: true,
        protein: true,
        fiber: true,
        sugar: true,
        sodium: true,
        consumedAt: true,
      },
    }),
  ]);

  const coachTip = getDailyCoachTip({
    totals: dayStats.totals,
    goals: dayStats.goals,
    meals: dayMeals.map((meal) => ({
      mealType: meal.mealType,
      calories: meal.calories,
      protein: meal.protein,
      name: meal.name,
    })),
  });
  const patterns = detectMealPatterns(weekMeals);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted-foreground">
          Tagesimpuls und Wochenrückblick auf deine Muster
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Heute</h2>
        <CoachTipCard tip={coachTip} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Wochenrückblick</h2>
        <Card>
          <CardHeader>
            <CardTitle>Durchschnitt vs. Tagesziel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {weekStats.mealCount} Mahlzeiten diese Woche · Ø{" "}
              {formatNumber(weekStats.averages.calories)} kcal/Tag
            </p>
            <NutrientProgress
              label="Kalorien (Ø/Tag)"
              current={weekStats.averages.calories}
              goal={weekStats.goals.dailyCaloriesGoal}
              unit="kcal"
            />
            <NutrientProgress
              label="Protein (Ø/Tag)"
              current={weekStats.averages.protein}
              goal={weekStats.goals.dailyProteinGoal}
              colorClass="bg-teal-600"
            />
            <NutrientProgress
              label="Ballaststoffe (Ø/Tag)"
              current={weekStats.averages.fiber}
              goal={weekStats.goals.dailyFiberGoal}
              colorClass="bg-emerald-700"
            />
            <NutrientProgress
              label="Zucker (Ø/Tag)"
              current={weekStats.averages.sugar}
              goal={weekStats.goals.dailySugarGoal}
              colorClass="bg-rose-600"
            />
          </CardContent>
        </Card>
        <PatternInsightsCard insights={patterns} />
      </section>
    </div>
  );
}
