import { NextResponse } from "next/server";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import {
  APP_DATE_FORMAT,
  APP_TIMEZONE,
  getRangeBoundsInAppTz,
} from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getStatsForUser } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const { from, to } = getRangeBoundsInAppTz("day", today);
  const dayKey = format(toZonedTime(today, APP_TIMEZONE), "yyyy-MM-dd");
  const dateLabel = format(toZonedTime(today, APP_TIMEZONE), APP_DATE_FORMAT, {
    locale: de,
  });

  const [stats, meals, profile, latestWeight] = await Promise.all([
    getStatsForUser(user.id, "day"),
    prisma.meal.findMany({
      where: {
        userId: user.id,
        consumedAt: { gte: from, lte: to },
      },
      orderBy: { consumedAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        mealType: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        portionSize: true,
        consumedAt: true,
        imagePath: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { weightKg: true },
    }),
    prisma.weightEntry.findFirst({
      where: { userId: user.id },
      orderBy: { recordedOn: "desc" },
      select: { kg: true },
    }),
  ]);

  return NextResponse.json({
    savedAt: new Date().toISOString(),
    dateLabel,
    dayKey,
    totals: {
      calories: stats.totals.calories,
      protein: stats.totals.protein,
      carbs: stats.totals.carbs,
      fat: stats.totals.fat,
    },
    goals: {
      calories: stats.goals.dailyCaloriesGoal,
      protein: stats.goals.dailyProteinGoal,
      carbs: stats.goals.dailyCarbsGoal,
      fat: stats.goals.dailyFatGoal,
    },
    meals: meals.map((meal) => ({
      ...meal,
      consumedAt: meal.consumedAt.toISOString(),
    })),
    weightKg: latestWeight?.kg ?? profile?.weightKg ?? null,
  });
}
