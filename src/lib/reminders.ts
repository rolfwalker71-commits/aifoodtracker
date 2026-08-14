import type { MealType } from "@/generated/prisma/client";

export type MealReminder = {
  id: string;
  mealType: MealType;
  timeLocal: string;
  enabled: boolean;
};

export type ExtraReminders = {
  restCoach: { enabled: boolean; timeLocal: string };
  weeklyWeight: { enabled: boolean; weekday: number; timeLocal: string };
};

export type ReminderSettings = {
  meals: MealReminder[];
  extras: ExtraReminders;
};

export const DEFAULT_REMINDERS: MealReminder[] = [
  { id: "breakfast", mealType: "BREAKFAST", timeLocal: "08:00", enabled: false },
  { id: "lunch", mealType: "LUNCH", timeLocal: "12:00", enabled: false },
  { id: "snack", mealType: "SNACK", timeLocal: "16:00", enabled: false },
  { id: "dinner", mealType: "DINNER", timeLocal: "18:30", enabled: false },
];

export const DEFAULT_EXTRAS: ExtraReminders = {
  restCoach: { enabled: true, timeLocal: "19:00" },
  weeklyWeight: { enabled: true, weekday: 0, timeLocal: "09:00" },
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function isMealReminder(item: unknown): item is MealReminder {
  if (!item || typeof item !== "object") return false;
  const row = item as MealReminder;
  return (
    typeof row.id === "string" &&
    typeof row.timeLocal === "string" &&
    typeof row.enabled === "boolean" &&
    ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(row.mealType)
  );
}

function normalizeMeals(value: unknown): MealReminder[] {
  const list = Array.isArray(value) ? value : [];
  const byId = new Map(
    list.filter(isMealReminder).map((item) => [item.id, item]),
  );
  return DEFAULT_REMINDERS.map((fallback) => {
    const existing = byId.get(fallback.id);
    if (!existing) return { ...fallback };
    return {
      ...fallback,
      ...existing,
      timeLocal: /^\d{2}:\d{2}$/.test(existing.timeLocal)
        ? existing.timeLocal
        : fallback.timeLocal,
    };
  });
}

function normalizeExtras(value: unknown): ExtraReminders {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<ExtraReminders>)
      : {};
  const rest = raw.restCoach;
  const weight = raw.weeklyWeight;
  return {
    restCoach: {
      enabled:
        typeof rest?.enabled === "boolean"
          ? rest.enabled
          : DEFAULT_EXTRAS.restCoach.enabled,
      timeLocal:
        rest?.timeLocal && /^\d{2}:\d{2}$/.test(rest.timeLocal)
          ? rest.timeLocal
          : DEFAULT_EXTRAS.restCoach.timeLocal,
    },
    weeklyWeight: {
      enabled:
        typeof weight?.enabled === "boolean"
          ? weight.enabled
          : DEFAULT_EXTRAS.weeklyWeight.enabled,
      weekday:
        typeof weight?.weekday === "number" && WEEKDAYS.includes(weight.weekday)
          ? weight.weekday
          : DEFAULT_EXTRAS.weeklyWeight.weekday,
      timeLocal:
        weight?.timeLocal && /^\d{2}:\d{2}$/.test(weight.timeLocal)
          ? weight.timeLocal
          : DEFAULT_EXTRAS.weeklyWeight.timeLocal,
    },
  };
}

/** Meal reminders only — keeps older array-shaped JSON working. */
export function normalizeReminders(value: unknown): MealReminder[] {
  return parseReminderSettings(value).meals;
}

export function parseReminderSettings(value: unknown): ReminderSettings {
  if (Array.isArray(value)) {
    return { meals: normalizeMeals(value), extras: { ...DEFAULT_EXTRAS } };
  }
  if (value && typeof value === "object") {
    const row = value as { meals?: unknown; extras?: unknown };
    if (Array.isArray(row.meals) || row.extras) {
      return {
        meals: normalizeMeals(row.meals),
        extras: normalizeExtras(row.extras),
      };
    }
  }
  return { meals: normalizeMeals(value), extras: { ...DEFAULT_EXTRAS } };
}

export function serializeReminderSettings(
  settings: ReminderSettings,
): ReminderSettings {
  return {
    meals: normalizeMeals(settings.meals),
    extras: normalizeExtras(settings.extras),
  };
}
