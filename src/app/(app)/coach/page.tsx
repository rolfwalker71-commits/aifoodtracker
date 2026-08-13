import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { CoachTipCard } from "@/components/dashboard/coach-tip-card";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { PatternInsightsCard } from "@/components/dashboard/pattern-insights-card";
import {
  DayRestBudgetCard,
  MicroWeekCard,
  PatternRadarCard,
  WeekReviewCard,
} from "@/components/coach/coach-panels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDailyCoachTip } from "@/lib/coach-tip";
import { getDayRestBudget } from "@/lib/day-plan";
import { getRangeBoundsInAppTz } from "@/lib/datetime";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { detectMealPatterns } from "@/lib/insights";
import { formatNumber } from "@/lib/utils";
import { getStatsForUser } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import {
  buildMicroWeekInsights,
  buildPatternRadar,
  buildWeekReview,
} from "@/lib/week-review";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date();
  const dayBounds = getRangeBoundsInAppTz("day", today);
  const weekBounds = getRangeBoundsInAppTz("week", today);

  const [dayStats, weekStats, dayMeals, weekMeals, user] = await Promise.all([
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
        carbs: true,
        fat: true,
        fiber: true,
        sugar: true,
        sodium: true,
        potassium: true,
        vitaminC: true,
        calcium: true,
        iron: true,
        consumedAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { goalMode: true },
    }),
  ]);

  const goalMode = normalizeGoalMode(user?.goalMode);
  const coachTip = getDailyCoachTip({
    totals: dayStats.totals,
    goals: dayStats.goals,
    goalMode,
    meals: dayMeals.map((meal) => ({
      mealType: meal.mealType,
      calories: meal.calories,
      protein: meal.protein,
      name: meal.name,
    })),
  });
  const restBudget = getDayRestBudget({
    totals: dayStats.totals,
    goals: dayStats.goals,
    goalMode,
  });
  const patterns = detectMealPatterns(weekMeals);
  const weekReview = buildWeekReview({
    meals: weekMeals,
    goals: weekStats.goals,
    goalMode,
  });
  const patternRadar = buildPatternRadar(weekMeals);
  const microWeek = buildMicroWeekInsights({
    meals: weekMeals,
    goals: weekStats.goals,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-2">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Coach</h1>
        <p className="text-sm text-muted-foreground">
          Tagesplan, Wochen-Review und Muster – abgestimmt auf deinen Ziel-Modus
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Heute</h2>
        <CoachTipCard tip={coachTip} />
        <DayRestBudgetCard budget={restBudget} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Wochen-Review</h2>
        <WeekReviewCard review={weekReview} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Durchschnitt vs. Tagesziel</CardTitle>
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
        <PatternRadarCard items={patternRadar} />
        <PatternInsightsCard insights={patterns} />
        <MicroWeekCard items={microWeek} />
      </section>
    </div>
  );
}
