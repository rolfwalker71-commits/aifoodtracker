import { NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, getRangeBoundsInAppTz } from "@/lib/datetime";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { prisma } from "@/lib/prisma";
import { requireRequestUser } from "@/lib/session";

/** Days of history the week strip and the streak are computed from. */
const HISTORY_DAYS = 7;

export const dynamic = "force-dynamic";

/**
 * One compact payload for home- and lock-screen widgets.
 *
 * Widgets get a few hundred milliseconds of runtime and refresh on iOS's
 * schedule, so everything they can show — today's totals, the meal list, the
 * week strip, the streak and the weight trend — comes back in a single call.
 */
export async function GET(request: Request) {
  const user = await requireRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { from: dayFrom, to: dayTo } = getRangeBoundsInAppTz("day", now);
  const historyFrom = getRangeBoundsInAppTz(
    "day",
    subDays(now, HISTORY_DAYS - 1),
  ).from;

  const [profile, historyMeals, weightEntries] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        name: true,
        goalMode: true,
        weightKg: true,
        dailyCaloriesGoal: true,
        dailyProteinGoal: true,
        dailyCarbsGoal: true,
        dailyFatGoal: true,
        dailyFiberGoal: true,
      },
    }),
    prisma.meal.findMany({
      where: { userId: user.id, consumedAt: { gte: historyFrom, lte: dayTo } },
      orderBy: { consumedAt: "asc" },
      select: {
        id: true,
        name: true,
        mealType: true,
        consumedAt: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fiber: true,
      },
    }),
    prisma.weightEntry.findMany({
      where: { userId: user.id },
      orderBy: { recordedOn: "desc" },
      take: 30,
    }),
  ]);

  const dayKey = (value: Date) =>
    format(toZonedTime(value, APP_TIMEZONE), "yyyy-MM-dd");
  const todayKey = dayKey(now);

  const todayMeals = historyMeals.filter(
    (meal) => meal.consumedAt >= dayFrom && meal.consumedAt <= dayTo,
  );

  const sum = (key: "calories" | "protein" | "carbs" | "fat" | "fiber") =>
    todayMeals.reduce((total, meal) => total + meal[key], 0);

  const goals = {
    calories: profile.dailyCaloriesGoal,
    protein: profile.dailyProteinGoal,
    carbs: profile.dailyCarbsGoal,
    fat: profile.dailyFatGoal,
    fiber: profile.dailyFiberGoal,
  };
  const totals = {
    calories: sum("calories"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
    fiber: sum("fiber"),
  };

  // Week strip: one bucket per calendar day, oldest first, today last.
  const byDay = new Map<string, number>();
  for (const meal of historyMeals) {
    const key = dayKey(meal.consumedAt);
    byDay.set(key, (byDay.get(key) ?? 0) + meal.calories);
  }
  const week = Array.from({ length: HISTORY_DAYS }, (_, index) => {
    const date = subDays(now, HISTORY_DAYS - 1 - index);
    const zoned = toZonedTime(date, APP_TIMEZONE);
    const key = format(zoned, "yyyy-MM-dd");
    return {
      date: key,
      label: format(zoned, "EEEEEE", { locale: de }),
      calories: Math.round(byDay.get(key) ?? 0),
      isToday: key === todayKey,
    };
  });

  // Streak: consecutive days back from today that have at least one meal.
  // Today only counts once something is logged, so an empty morning does not
  // read as a broken streak.
  let streak = 0;
  for (let index = week.length - 1; index >= 0; index -= 1) {
    const day = week[index];
    if ((byDay.get(day.date) ?? 0) > 0) {
      streak += 1;
    } else if (!day.isToday) {
      break;
    }
  }

  const latestWeight = weightEntries[0];
  const olderWeight = weightEntries.find(
    (entry) =>
      latestWeight &&
      entry.recordedOn.getTime() <=
        latestWeight.recordedOn.getTime() - 7 * 86_400_000,
  );

  return NextResponse.json(
    {
      generatedAt: now.toISOString(),
      timezone: APP_TIMEZONE,
      user: { name: profile.name ?? null },
      goalMode: normalizeGoalMode(profile.goalMode),
      today: {
        date: todayKey,
        label: format(toZonedTime(now, APP_TIMEZONE), "EEEE, d. MMMM", {
          locale: de,
        }),
        mealCount: todayMeals.length,
        totals,
        remaining: {
          calories: goals.calories - totals.calories,
          protein: goals.protein - totals.protein,
          carbs: goals.carbs - totals.carbs,
          fat: goals.fat - totals.fat,
          fiber: goals.fiber - totals.fiber,
        },
        meals: todayMeals
          .slice()
          .reverse()
          .map((meal) => ({
            id: meal.id,
            name: meal.name,
            mealType: meal.mealType,
            time: format(toZonedTime(meal.consumedAt, APP_TIMEZONE), "HH:mm"),
            calories: Math.round(meal.calories),
            protein: Math.round(meal.protein),
          })),
      },
      goals,
      week,
      streak,
      weight: latestWeight
        ? {
            kg: latestWeight.kg,
            recordedOn: format(latestWeight.recordedOn, "yyyy-MM-dd"),
            trendKg: olderWeight
              ? Math.round((latestWeight.kg - olderWeight.kg) * 10) / 10
              : null,
          }
        : profile.weightKg
          ? { kg: profile.weightKg, recordedOn: null, trendKg: null }
          : null,
    },
    { headers: NO_STORE_HEADERS },
  );
}
