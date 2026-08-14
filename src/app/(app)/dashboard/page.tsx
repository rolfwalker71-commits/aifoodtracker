import Link from "next/link";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Camera, ChartColumn, Sparkles } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MacroChart } from "@/components/dashboard/macro-chart";
import { DailyGoalsSummary } from "@/components/dashboard/daily-goals-summary";
import { FavoriteMealsStrip } from "@/components/meals/favorite-meals-strip";
import { MealList } from "@/components/meals/meal-list";
import { RepeatMealsStrip } from "@/components/meals/repeat-meals-strip";
import { PushEnableButton } from "@/components/push/push-enable-button";
import { WeightCard } from "@/components/weight/weight-card";
import { pickRepeatCandidates } from "@/lib/repeat-meals";
import { DayRestBudgetCard } from "@/components/coach/coach-panels";
import { UserAvatar } from "@/components/settings/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getDailyCoachTip } from "@/lib/coach-tip";
import { getDayRestBudget } from "@/lib/day-plan";
import {
  APP_DATE_FORMAT,
  APP_TIMEZONE,
  getRangeBoundsInAppTz,
} from "@/lib/datetime";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { formatNumber } from "@/lib/utils";
import { getStatsForUser } from "@/lib/stats";
import { prisma } from "@/lib/prisma";
import { resolveAvatarForUser } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date();
  const { from, to } = getRangeBoundsInAppTz("day", today);
  const yesterdayBounds = getRangeBoundsInAppTz("day", subDays(today, 1));
  const recentFrom = getRangeBoundsInAppTz("week", today).from;
  const [
    stats,
    meals,
    favorites,
    profile,
    yesterdayMeals,
    recentMeals,
    weightEntries,
  ] = await Promise.all([
    getStatsForUser(session.user.id, "day"),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: from, lte: to },
      },
      orderBy: { consumedAt: "desc" },
      take: 12,
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        isFavorite: true,
      },
      orderBy: [{ updatedAt: "desc" }, { consumedAt: "desc" }],
      take: 12,
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        avatarPath: true,
        sex: true,
        heightCm: true,
        weightKg: true,
        birthYear: true,
        autoCalculateGoals: true,
        goalMode: true,
      },
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: {
          gte: yesterdayBounds.from,
          lte: yesterdayBounds.to,
        },
      },
      orderBy: { consumedAt: "desc" },
      take: 12,
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: recentFrom, lte: to },
      },
      orderBy: { consumedAt: "desc" },
      take: 40,
    }),
    prisma.weightEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { recordedOn: "asc" },
      take: 90,
    }),
  ]);
  const repeatMeals = pickRepeatCandidates({
    yesterday: yesterdayMeals,
    recent: recentMeals,
  });
  const todayLabel = toZonedTime(today, APP_TIMEZONE);
  const profileComplete = Boolean(
    profile?.sex &&
      profile.heightCm &&
      profile.weightKg &&
      profile.birthYear,
  );
  const goalMode = normalizeGoalMode(profile?.goalMode);
  const coachTip = getDailyCoachTip({
    totals: stats.totals,
    goals: stats.goals,
    goalMode,
    meals: meals.map((meal) => ({
      mealType: meal.mealType,
      calories: meal.calories,
      protein: meal.protein,
      name: meal.name,
    })),
  });
  const restBudget = getDayRestBudget({
    totals: stats.totals,
    goals: stats.goals,
    goalMode,
  });
  const avatarPath = await resolveAvatarForUser({
    userId: session.user.id,
    avatarPath: profile?.avatarPath,
  });

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-4 animate-rise">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(todayLabel, `EEEE, ${APP_DATE_FORMAT}`, { locale: de })}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Hallo {session.user.name?.split(" ")[0] || "du"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Heute {formatNumber(stats.totals.calories)} /{" "}
            {formatNumber(stats.goals.dailyCaloriesGoal)} kcal
          </p>
        </div>
        <UserAvatar
          src={avatarPath}
          className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
        />
      </section>

      <Card className="animate-rise">
        <CardContent className="flex items-start justify-between gap-3 pt-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Coach</p>
            <p className="mt-1 text-sm text-muted-foreground">{coachTip.body}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/coach">
              <Sparkles className="h-4 w-4" />
              Öffnen
            </Link>
          </Button>
        </CardContent>
      </Card>

      <DayRestBudgetCard budget={restBudget} />

      <PushEnableButton compact />

      <RepeatMealsStrip meals={repeatMeals} />

      <WeightCard
        currentKg={weightEntries.at(-1)?.kg ?? profile?.weightKg ?? null}
        entries={weightEntries.map((entry) => ({
          kg: entry.kg,
          recordedOn: entry.recordedOn.toISOString().slice(0, 10),
        }))}
      />

      <section className="grid gap-3 sm:grid-cols-2 animate-rise-delay">
        <Button asChild size="lg" className="h-14 justify-start px-5">
          <Link href="/meals/new">
            <Camera className="h-5 w-5" />
            Mahlzeit erfassen
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 justify-start px-5">
          <Link href="/stats">
            <ChartColumn className="h-5 w-5" />
            Statistiken öffnen
          </Link>
        </Button>
      </section>

      <FavoriteMealsStrip
        meals={favorites.map((meal) => ({
          ...meal,
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Tagesbedarf</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyGoalsSummary
              totals={stats.totals}
              goals={stats.goals}
              profileComplete={profileComplete}
            />
          </CardContent>
        </Card>

        <Card className="animate-rise-delay">
          <CardHeader>
            <CardTitle>Makro-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroChart
              protein={stats.totals.protein}
              carbs={stats.totals.carbs}
              fat={stats.totals.fat}
            />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <div>Protein {formatNumber(stats.totals.protein, 0)} g</div>
              <div>Kohlenhydrate {formatNumber(stats.totals.carbs, 0)} g</div>
              <div>Fett {formatNumber(stats.totals.fat, 0)} g</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Heute</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/meals">Alle anzeigen</Link>
          </Button>
        </div>
        <MealList
          meals={meals.map((meal) => ({
            ...meal,
            consumedAt: meal.consumedAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
