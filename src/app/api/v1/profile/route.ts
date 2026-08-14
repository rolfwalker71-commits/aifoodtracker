import { NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/meal-cache";
import { prisma } from "@/lib/prisma";
import { parseReminderSettings } from "@/lib/reminders";
import { requireRequestUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await requireRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      sex: true,
      heightCm: true,
      weightKg: true,
      birthYear: true,
      activityLevel: true,
      autoCalculateGoals: true,
      dailyCaloriesGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
      dailyFiberGoal: true,
      dailySugarGoal: true,
      dailySodiumGoal: true,
      dailyPotassiumGoal: true,
      dailyVitaminAGoal: true,
      dailyVitaminCGoal: true,
      dailyVitaminDGoal: true,
      dailyCalciumGoal: true,
      dailyIronGoal: true,
      reminders: true,
      themePreference: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    {
      profile: {
        ...profile,
        reminders: parseReminderSettings(profile.reminders),
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}
