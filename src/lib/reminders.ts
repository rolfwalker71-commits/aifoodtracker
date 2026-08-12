export type MealReminder = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  timeLocal: string;
  enabled: boolean;
};

export const DEFAULT_REMINDERS: MealReminder[] = [
  { id: "breakfast", mealType: "BREAKFAST", timeLocal: "08:00", enabled: false },
  { id: "lunch", mealType: "LUNCH", timeLocal: "12:00", enabled: false },
  { id: "snack", mealType: "SNACK", timeLocal: "16:00", enabled: false },
  { id: "dinner", mealType: "DINNER", timeLocal: "18:30", enabled: false },
];

export function normalizeReminders(value: unknown): MealReminder[] {
  if (!Array.isArray(value)) return DEFAULT_REMINDERS.map((item) => ({ ...item }));

  const byId = new Map(
    value
      .filter((item): item is MealReminder => {
        if (!item || typeof item !== "object") return false;
        const row = item as MealReminder;
        return (
          typeof row.id === "string" &&
          typeof row.timeLocal === "string" &&
          typeof row.enabled === "boolean" &&
          ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(row.mealType)
        );
      })
      .map((item) => [item.id, item]),
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
