import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { RepeatMealsStrip } from "@/components/meals/repeat-meals-strip";
import { FavoriteMealsStrip } from "@/components/meals/favorite-meals-strip";
import { MealList } from "@/components/meals/meal-list";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickRepeatCandidates } from "@/lib/repeat-meals";
import { getRangeBoundsInAppTz } from "@/lib/datetime";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  noStore();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date();
  const yesterday = getRangeBoundsInAppTz("day", subDays(today, 1));
  const week = getRangeBoundsInAppTz("week", today);

  const [meals, favorites, yesterdayMeals, recentMeals] = await Promise.all([
    prisma.meal.findMany({
      where: { userId: session.user.id },
      orderBy: { consumedAt: "desc" },
      take: 50,
    }),
    prisma.meal.findMany({
      where: { userId: session.user.id, isFavorite: true },
      orderBy: [{ updatedAt: "desc" }, { consumedAt: "desc" }],
      take: 20,
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: yesterday.from, lte: yesterday.to },
      },
      orderBy: { consumedAt: "desc" },
      take: 12,
    }),
    prisma.meal.findMany({
      where: {
        userId: session.user.id,
        consumedAt: { gte: week.from, lte: week.to },
      },
      orderBy: { consumedAt: "desc" },
      take: 40,
    }),
  ]);
  const repeatMeals = pickRepeatCandidates({
    yesterday: yesterdayMeals,
    recent: recentMeals,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mahlzeiten
        </h1>
        <p className="text-sm text-muted-foreground">
          Deine letzten Einträge im Überblick
        </p>
      </div>
      <RepeatMealsStrip meals={repeatMeals} />
      <FavoriteMealsStrip meals={favorites} />
      <MealList
        meals={meals.map((meal) => ({
          ...meal,
          consumedAt: meal.consumedAt.toISOString(),
        }))}
      />
    </div>
  );
}
