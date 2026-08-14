import { getDayRestBudget } from "@/lib/day-plan";
import { APP_TIMEZONE, getRangeBoundsInAppTz } from "@/lib/datetime";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { parseReminderSettings } from "@/lib/reminders";
import { getStatsForUser } from "@/lib/stats";
import { formatNumber } from "@/lib/utils";
import { buildPushPayload, mealTypeToPushKind } from "@/lib/push-motifs";
import { claimDelivery, sendPushToUser } from "@/lib/push";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function zurichNowParts(now = new Date()) {
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(now);
  return { dayKey, time, weekday: WEEKDAY_INDEX[weekdayName] ?? 0 };
}

export async function dispatchDuePushes(now = new Date()) {
  const { dayKey, time, weekday } = zurichNowParts(now);
  const { from, to } = getRangeBoundsInAppTz("day", now);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      pushSubscriptions: { some: {} },
    },
    select: {
      id: true,
      reminders: true,
      goalMode: true,
    },
  });

  let sent = 0;
  for (const user of users) {
    const settings = parseReminderSettings(user.reminders);
    const todayMeals = await prisma.meal.findMany({
      where: { userId: user.id, consumedAt: { gte: from, lte: to } },
      select: { mealType: true },
    });
    const loggedTypes = new Set(todayMeals.map((meal) => meal.mealType));

    for (const reminder of settings.meals) {
      if (!reminder.enabled) continue;
      if (reminder.timeLocal !== time) continue;
      if (loggedTypes.has(reminder.mealType)) continue;
      const kind = mealTypeToPushKind(reminder.mealType);
      if (!(await claimDelivery(user.id, kind, dayKey))) continue;
      const label = MEAL_TYPE_LABELS[reminder.mealType];
      const result = await sendPushToUser(
        user.id,
        buildPushPayload(
          kind,
          `${label} eintragen?`,
          `Zeit für ${label}. Tippe zum Erfassen oder 1-Tap-Wiederholen.`,
          "/meals/new",
          `meal-${kind}-${dayKey}`,
        ),
      );
      sent += result.sent;
    }

    if (
      settings.extras.restCoach.enabled &&
      settings.extras.restCoach.timeLocal === time
    ) {
      if (await claimDelivery(user.id, "rest", dayKey)) {
        const stats = await getStatsForUser(user.id, "day");
        const budget = getDayRestBudget({
          totals: stats.totals,
          goals: stats.goals,
          goalMode: normalizeGoalMode(user.goalMode),
        });
        const result = await sendPushToUser(
          user.id,
          buildPushPayload(
            "rest",
            budget.suggestion.title,
            `${budget.suggestion.body} Noch ${formatNumber(Math.max(0, budget.kcalLeft), 0)} kcal.`,
            "/coach",
            `rest-${dayKey}`,
          ),
        );
        sent += result.sent;
      }
    }

    if (
      settings.extras.weeklyWeight.enabled &&
      settings.extras.weeklyWeight.weekday === weekday &&
      settings.extras.weeklyWeight.timeLocal === time
    ) {
      if (await claimDelivery(user.id, "weight", dayKey)) {
        const result = await sendPushToUser(
          user.id,
          buildPushPayload(
            "weight",
            "Gewicht checken",
            "Kurzer Check-in: heutiges Gewicht eintragen – dauert 5 Sekunden.",
            "/dashboard#gewicht",
            `weight-${dayKey}`,
          ),
        );
        sent += result.sent;
      }
    }
  }

  return { sent, dayKey, time };
}
