import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Camera, ChartColumn } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { MacroChart } from "@/components/dashboard/macro-chart";
import { NutrientProgress } from "@/components/dashboard/nutrient-progress";
import { MealList } from "@/components/meals/meal-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { APP_TIMEZONE, getRangeBoundsInAppTz } from "@/lib/datetime";
import { formatNumber } from "@/lib/utils";
import { getStatsForUser } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date();
  const { from, to } = getRangeBoundsInAppTz("day", today);
  const [stats, meals, profile] = await Promise.all([
    getStatsForUser(session.user.id, "day"),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: from, lte: to },
      },
      orderBy: { consumedAt: "desc" },
      take: 12,
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        sex: true,
        heightCm: true,
        weightKg: true,
        birthYear: true,
        autoCalculateGoals: true,
      },
    }),
  ]);
  const todayLabel = toZonedTime(today, APP_TIMEZONE);
  const profileComplete = Boolean(
    profile?.sex &&
      profile.heightCm &&
      profile.weightKg &&
      profile.birthYear,
  );

  return (
    <div className="space-y-6">
      <section className="animate-rise">
        <p className="text-sm text-muted-foreground">
          {format(todayLabel, "EEEE, d. MMMM", { locale: de })}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Hallo {session.user.name?.split(" ")[0] || "du"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Heute {formatNumber(stats.totals.calories)} /{" "}
          {formatNumber(stats.goals.dailyCaloriesGoal)} kcal
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 animate-rise-delay">
        <Button asChild size="lg" className="h-14 justify-start px-5">
          <Link href="/meals/new">
            <Camera className="h-5 w-5" />
            Mahlzeit per Foto erfassen
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 justify-start px-5">
          <Link href="/stats">
            <ChartColumn className="h-5 w-5" />
            Statistiken öffnen
          </Link>
        </Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Tagesbedarf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profileComplete && (
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                Für eine persönliche Kalorienberechnung bitte unter{" "}
                <Link href="/settings" className="font-semibold underline">
                  Benutzer
                </Link>{" "}
                Geschlecht, Grösse, Gewicht und Geburtsjahr hinterlegen.
              </p>
            )}
            <NutrientProgress
              label="Kalorien"
              current={stats.totals.calories}
              goal={stats.goals.dailyCaloriesGoal}
              unit="kcal"
            />
            <NutrientProgress
              label="Protein"
              current={stats.totals.protein}
              goal={stats.goals.dailyProteinGoal}
              colorClass="bg-teal-600"
            />
            <NutrientProgress
              label="Kohlenhydrate"
              current={stats.totals.carbs}
              goal={stats.goals.dailyCarbsGoal}
              colorClass="bg-cyan-600"
            />
            <NutrientProgress
              label="Fett"
              current={stats.totals.fat}
              goal={stats.goals.dailyFatGoal}
              colorClass="bg-orange-600"
            />
            <NutrientProgress
              label="Ballaststoffe"
              current={stats.totals.fiber}
              goal={stats.goals.dailyFiberGoal}
              colorClass="bg-emerald-700"
            />
            <NutrientProgress
              label="Natrium"
              current={stats.totals.sodium}
              goal={stats.goals.dailySodiumGoal}
              unit="mg"
              colorClass="bg-sky-700"
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
              <div>Protein {formatNumber(stats.totals.protein, 0)}g</div>
              <div>Carbs {formatNumber(stats.totals.carbs, 0)}g</div>
              <div>Fett {formatNumber(stats.totals.fat, 0)}g</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Heute</h2>
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
