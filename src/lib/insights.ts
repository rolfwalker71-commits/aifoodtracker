import { format, getDay, getHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/datetime";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";

export type PatternInsight = {
  title: string;
  body: string;
};

type MealRow = {
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  fiber: number;
  sugar: number;
  sodium: number;
  consumedAt: Date;
};

function zoned(date: Date) {
  return toZonedTime(date, APP_TIMEZONE);
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Einfache Muster aus den letzten Mahlzeiten (regelbasiert). */
export function detectMealPatterns(meals: MealRow[]): PatternInsight[] {
  if (meals.length < 3) {
    return [
      {
        title: "Noch wenig Daten",
        body: "Ab etwa einer Woche Einträgen werden hier typische Muster sichtbar.",
      },
    ];
  }

  const insights: PatternInsight[] = [];

  // Repeated dishes
  const nameCounts = new Map<string, { label: string; count: number }>();
  for (const meal of meals) {
    const key = normalizeName(meal.name);
    if (!key) continue;
    const prev = nameCounts.get(key);
    if (prev) prev.count += 1;
    else nameCounts.set(key, { label: meal.name, count: 1 });
  }
  const topRepeat = [...nameCounts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)[0];
  if (topRepeat) {
    insights.push({
      title: "Wiederkehrendes Gericht",
      body: `„${topRepeat.label}“ kam ${topRepeat.count}× vor. Speichern als Favorit spart später Zeit.`,
    });
  }

  // Weekend vs weekday calories
  let weekdaySum = 0;
  let weekdayDays = new Set<string>();
  let weekendSum = 0;
  let weekendDays = new Set<string>();
  for (const meal of meals) {
    const local = zoned(meal.consumedAt);
    const key = format(local, "yyyy-MM-dd");
    const dow = getDay(local); // 0 Sun
    if (dow === 0 || dow === 6) {
      weekendSum += meal.calories;
      weekendDays.add(key);
    } else {
      weekdaySum += meal.calories;
      weekdayDays.add(key);
    }
  }
  if (weekdayDays.size >= 2 && weekendDays.size >= 1) {
    const weekdayAvg = weekdaySum / weekdayDays.size;
    const weekendAvg = weekendSum / weekendDays.size;
    const delta = weekendAvg - weekdayAvg;
    if (Math.abs(delta) >= 150) {
      insights.push({
        title: "Wochenende vs. Werktag",
        body:
          delta > 0
            ? `Am Wochenende lagst du im Schnitt ca. ${formatNumber(delta, 0)} kcal höher als unter der Woche.`
            : `Am Wochenende lagst du im Schnitt ca. ${formatNumber(Math.abs(delta), 0)} kcal tiefer als unter der Woche.`,
      });
    }
  }

  // Late snacks
  const lateSnacks = meals.filter((meal) => {
    const hour = getHours(zoned(meal.consumedAt));
    return meal.mealType === "SNACK" && hour >= 21;
  });
  if (lateSnacks.length >= 2) {
    insights.push({
      title: "Späte Snacks",
      body: `${lateSnacks.length} Snacks nach 21 Uhr. Wenn gewollt: früherer Abendimbiss kann helfen.`,
    });
  }

  // Protein-light days (by day)
  const byDay = new Map<string, { protein: number; calories: number }>();
  for (const meal of meals) {
    const key = format(zoned(meal.consumedAt), "yyyy-MM-dd");
    const row = byDay.get(key) || { protein: 0, calories: 0 };
    row.protein += meal.protein;
    row.calories += meal.calories;
    byDay.set(key, row);
  }
  const lowProteinDays = [...byDay.values()].filter(
    (day) => day.calories >= 1200 && day.protein < 60,
  ).length;
  if (lowProteinDays >= 2) {
    insights.push({
      title: "Protein-Muster",
      body: `An ${lowProteinDays} Tagen mit normaler Kalorienmenge blieb Protein unter 60 g. Eine proteinreiche Mahlzeit am Mittag wirkt oft ausgleichend.`,
    });
  }

  // Meal type dominance
  const typeCounts = new Map<MealType, number>();
  for (const meal of meals) {
    typeCounts.set(meal.mealType, (typeCounts.get(meal.mealType) || 0) + 1);
  }
  const dominant = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (dominant && dominant[1] >= meals.length * 0.45) {
    insights.push({
      title: "Häufigste Kategorie",
      body: `${MEAL_TYPE_LABELS[dominant[0]]} macht ${formatNumber((dominant[1] / meals.length) * 100, 0)} % deiner Einträge aus.`,
    });
  }

  // High sugar days
  const sugary = meals.filter((m) => m.sugar >= 25).length;
  if (sugary >= 3) {
    insights.push({
      title: "Zucker-Häufung",
      body: `${sugary} Einträge mit ≥ 25 g Zucker. Ein Frucht-/Snack-Tausch kann den Schnitt senken.`,
    });
  }

  return insights.slice(0, 4);
}
