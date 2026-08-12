import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { sumNutrients } from "@/lib/nutrition";
import type { StatsRange } from "@/types/meals";

export function getRangeBounds(range: StatsRange, reference = new Date()) {
  if (range === "day") {
    return {
      from: startOfDay(reference),
      to: endOfDay(reference),
    };
  }
  if (range === "week") {
    return {
      from: startOfWeek(reference, { weekStartsOn: 1 }),
      to: endOfWeek(reference, { weekStartsOn: 1 }),
    };
  }
  return {
    from: startOfMonth(reference),
    to: endOfMonth(reference),
  };
}

export async function getStatsForUser(userId: string, range: StatsRange) {
  const { from, to } = getRangeBounds(range);
  const [user, meals] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.meal.findMany({
      where: {
        userId,
        consumedAt: { gte: from, lte: to },
      },
      orderBy: { consumedAt: "asc" },
    }),
  ]);

  const totals = sumNutrients(meals);
  const days =
    range === "day"
      ? [from]
      : eachDayOfInterval({
          start: range === "week" ? from : subDays(to, 29) > from ? from : from,
          end: to,
        });

  const series = days.map((day) => {
    const dayMeals = meals.filter(
      (meal) =>
        meal.consumedAt >= startOfDay(day) && meal.consumedAt <= endOfDay(day),
    );
    const dayTotals = sumNutrients(dayMeals);
    return {
      label:
        range === "month"
          ? format(day, "dd.MM", { locale: de })
          : format(day, range === "day" ? "HH:mm" : "EEE", { locale: de }),
      ...dayTotals,
    };
  });

  // For day view, group by meal instead of empty hourly buckets
  const daySeries =
    range === "day"
      ? meals.map((meal) => ({
          label: format(meal.consumedAt, "HH:mm", { locale: de }),
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
          sugar: meal.sugar,
          saturatedFat: meal.saturatedFat,
          sodium: meal.sodium,
          potassium: meal.potassium,
          vitaminA: meal.vitaminA,
          vitaminC: meal.vitaminC,
          vitaminD: meal.vitaminD,
          calcium: meal.calcium,
          iron: meal.iron,
        }))
      : series;

  const dayCount = Math.max(
    1,
    new Set(meals.map((m) => format(m.consumedAt, "yyyy-MM-dd"))).size ||
      (range === "day" ? 1 : days.length),
  );

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    averages: {
      calories: totals.calories / dayCount,
      protein: totals.protein / dayCount,
      carbs: totals.carbs / dayCount,
      fat: totals.fat / dayCount,
      fiber: totals.fiber / dayCount,
      sugar: totals.sugar / dayCount,
      sodium: totals.sodium / dayCount,
      potassium: totals.potassium / dayCount,
    },
    goals: {
      dailyCaloriesGoal: user.dailyCaloriesGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      dailyCarbsGoal: user.dailyCarbsGoal,
      dailyFatGoal: user.dailyFatGoal,
      dailyFiberGoal: user.dailyFiberGoal,
      dailySugarGoal: user.dailySugarGoal,
      dailySodiumGoal: user.dailySodiumGoal,
      dailyPotassiumGoal: user.dailyPotassiumGoal,
    },
    series: daySeries,
    mealCount: meals.length,
  };
}
