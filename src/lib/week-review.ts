import { format, getDay, getHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/datetime";
import type { GoalMode } from "@/lib/goal-mode";
import type { NutritionGoals } from "@/lib/nutrition";
import { formatNumber } from "@/lib/utils";
import type { MealType } from "@/generated/prisma/client";

export type WeekReview = {
  title: string;
  summary: string;
  highlights: string[];
  nextFocus: string[];
};

export type MicroWeekItem = {
  key: string;
  label: string;
  avg: number;
  goal: number;
  unit: string;
  foodHints: string[];
};

type MealRow = {
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  consumedAt: Date;
};

function zoned(date: Date) {
  return toZonedTime(date, APP_TIMEZONE);
}

function dayKey(date: Date) {
  return format(zoned(date), "yyyy-MM-dd");
}

function averagesByDay(meals: MealRow[]) {
  const byDay = new Map<
    string,
    {
      calories: number;
      protein: number;
      fiber: number;
      sugar: number;
      sodium: number;
      potassium: number;
      vitaminC: number;
      calcium: number;
      iron: number;
    }
  >();
  for (const meal of meals) {
    const key = dayKey(meal.consumedAt);
    const row = byDay.get(key) || {
      calories: 0,
      protein: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      potassium: 0,
      vitaminC: 0,
      calcium: 0,
      iron: 0,
    };
    row.calories += meal.calories;
    row.protein += meal.protein;
    row.fiber += meal.fiber;
    row.sugar += meal.sugar;
    row.sodium += meal.sodium;
    row.potassium += meal.potassium ?? 0;
    row.vitaminC += meal.vitaminC ?? 0;
    row.calcium += meal.calcium ?? 0;
    row.iron += meal.iron ?? 0;
    byDay.set(key, row);
  }
  return byDay;
}

/** Wochen-Review mit Fokus für die nächste Woche. */
export function buildWeekReview(params: {
  meals: MealRow[];
  goals: NutritionGoals;
  goalMode?: GoalMode;
}): WeekReview {
  const mode = params.goalMode ?? "MAINTAIN";
  const byDay = averagesByDay(params.meals);
  const days = [...byDay.values()];
  if (days.length < 2) {
    return {
      title: "Wochen-Review",
      summary: "Noch zu wenig Tage geloggt für einen belastbaren Wochenblick.",
      highlights: ["Diese Woche weiter erfassen – ab 4–5 Tagen wird es aussagekräftig."],
      nextFocus: ["Jeden Tag mindestens die Hauptmahlzeiten loggen"],
    };
  }

  const avg = (fn: (d: (typeof days)[0]) => number) =>
    days.reduce((sum, d) => sum + fn(d), 0) / days.length;

  const avgKcal = avg((d) => d.calories);
  const avgProtein = avg((d) => d.protein);
  const avgFiber = avg((d) => d.fiber);
  const proteinHit = days.filter(
    (d) => d.protein >= params.goals.dailyProteinGoal * 0.9,
  ).length;
  const kcalHit = days.filter((d) => {
    const ratio = d.calories / params.goals.dailyCaloriesGoal;
    if (mode === "LOSE") return ratio <= 1.05;
    if (mode === "GAIN") return ratio >= 0.9;
    return ratio >= 0.85 && ratio <= 1.1;
  }).length;

  const lateCount = params.meals.filter((m) => getHours(zoned(m.consumedAt)) >= 21)
    .length;

  const highlights: string[] = [
    `Proteinziel an ${proteinHit}/${days.length} Tagen erreicht (±10 %).`,
    `Kalorienziel-Modus „${mode === "LOSE" ? "Abnehmen" : mode === "GAIN" ? "Muskelaufbau" : "Halten"}“ an ${kcalHit}/${days.length} Tagen im Rahmen.`,
    `Ø ${formatNumber(avgKcal, 0)} kcal · Ø ${formatNumber(avgProtein, 0)} g Protein · Ø ${formatNumber(avgFiber, 0)} g Ballaststoffe.`,
  ];
  if (lateCount >= 3) {
    highlights.push(`${lateCount} Einträge nach 21 Uhr – Muster für den Abend prüfen.`);
  }

  const nextFocus: string[] = [];
  if (proteinHit < days.length * 0.6) {
    nextFocus.push(
      mode === "GAIN"
        ? "Nächste Woche: eine proteinreiche Hauptmahlzeit pro Tag fest einplanen"
        : "Nächste Woche: Protein in der ersten Hälfte des Tages priorisieren",
    );
  }
  if (avgFiber < params.goals.dailyFiberGoal * 0.75) {
    nextFocus.push("Ballaststoffe: täglich Gemüse oder Vollkorn bewusst einbauen");
  }
  if (mode === "LOSE" && avgKcal > params.goals.dailyCaloriesGoal * 1.05) {
    nextFocus.push("Kalorien leicht drosseln – besonders Saucen/Snacks");
  }
  if (mode === "GAIN" && avgKcal < params.goals.dailyCaloriesGoal * 0.9) {
    nextFocus.push("Energie erhöhen: Beilagen und proteinreiche Shakes");
  }
  if (lateCount >= 3) {
    nextFocus.push("Abendfenster: Snacks vor 21 Uhr legen");
  }
  if (!nextFocus.length) {
    nextFocus.push("Rhythmus beibehalten und weiter sauber loggen");
  }

  return {
    title: "Wochen-Review",
    summary: `Auswertung über ${days.length} Tage mit Einträgen.`,
    highlights: highlights.slice(0, 4),
    nextFocus: nextFocus.slice(0, 3),
  };
}

/** Mikronährstoff-Wochenblick: wo oft unter Ziel, inkl. Lebensmittel-Hinweise. */
export function buildMicroWeekInsights(params: {
  meals: MealRow[];
  goals: NutritionGoals;
}): MicroWeekItem[] {
  const byDay = averagesByDay(params.meals);
  const days = [...byDay.values()];
  if (!days.length) return [];

  const avg = (fn: (d: (typeof days)[0]) => number) =>
    days.reduce((sum, d) => sum + fn(d), 0) / days.length;

  const candidates: MicroWeekItem[] = [
    {
      key: "fiber",
      label: "Ballaststoffe",
      avg: avg((d) => d.fiber),
      goal: params.goals.dailyFiberGoal,
      unit: "g",
      foodHints: ["Gemüse, Beeren", "Vollkorn", "Hülsenfrüchte"],
    },
    {
      key: "iron",
      label: "Eisen",
      avg: avg((d) => d.iron),
      goal: params.goals.dailyIronGoal,
      unit: "mg",
      foodHints: ["Hülsenfrüchte", "Fleisch/Leber sparsam", "Hafer + Vitamin C"],
    },
    {
      key: "calcium",
      label: "Kalzium",
      avg: avg((d) => d.calcium),
      goal: params.goals.dailyCalciumGoal,
      unit: "mg",
      foodHints: ["Milchprodukte", "Joghurt/Käse", "Mandeln, Sesam"],
    },
    {
      key: "vitaminC",
      label: "Vitamin C",
      avg: avg((d) => d.vitaminC),
      goal: params.goals.dailyVitaminCGoal,
      unit: "mg",
      foodHints: ["Paprika, Beeren", "Zitrusfrüchte", "Broccoli/Kohl"],
    },
    {
      key: "potassium",
      label: "Kalium",
      avg: avg((d) => d.potassium),
      goal: params.goals.dailyPotassiumGoal,
      unit: "mg",
      foodHints: ["Banane, Kartoffel", "Spinat", "Hülsenfrüchte"],
    },
  ];

  return candidates
    .filter((item) => item.avg < item.goal * 0.85)
    .sort((a, b) => a.avg / a.goal - b.avg / b.goal)
    .slice(0, 4);
}

/** Erweitertes Muster-Radar (Wochentags-Peaks, späte Snacks, …). */
export function buildPatternRadar(meals: MealRow[]): {
  title: string;
  body: string;
}[] {
  if (meals.length < 4) {
    return [
      {
        title: "Muster-Radar",
        body: "Ab etwa einer Woche Einträgen erscheinen hier Wochentags-Peaks und Timing-Muster.",
      },
    ];
  }

  const items: { title: string; body: string }[] = [];
  const weekdayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  // Weekday calorie peaks
  const byDow = new Map<number, { sum: number; days: Set<string> }>();
  for (const meal of meals) {
    const local = zoned(meal.consumedAt);
    const dow = getDay(local);
    const key = dayKey(meal.consumedAt);
    const row = byDow.get(dow) || { sum: 0, days: new Set<string>() };
    row.sum += meal.calories;
    row.days.add(key);
    byDow.set(dow, row);
  }
  const dowAvgs = [...byDow.entries()]
    .filter(([, v]) => v.days.size >= 1)
    .map(([dow, v]) => ({
      dow,
      avg: v.sum / v.days.size,
      days: v.days.size,
    }))
    .sort((a, b) => b.avg - a.avg);
  if (dowAvgs.length >= 3) {
    const top = dowAvgs[0]!;
    const bottom = dowAvgs[dowAvgs.length - 1]!;
    if (top.avg - bottom.avg >= 180) {
      items.push({
        title: "Wochentags-Peak",
        body: `${weekdayNames[top.dow]} liegt mit Ø ${formatNumber(top.avg, 0)} kcal klar über ${weekdayNames[bottom.dow]} (Ø ${formatNumber(bottom.avg, 0)} kcal).`,
      });
    }
  }

  const late = meals.filter((m) => getHours(zoned(m.consumedAt)) >= 21);
  if (late.length >= 2) {
    const lateKcal = late.reduce((s, m) => s + m.calories, 0);
    items.push({
      title: "Späte Energie",
      body: `${late.length} Einträge nach 21 Uhr · zusammen ca. ${formatNumber(lateKcal, 0)} kcal.`,
    });
  }

  const snackShare =
    meals.filter((m) => m.mealType === "SNACK").length / meals.length;
  if (snackShare >= 0.35) {
    items.push({
      title: "Snack-lastig",
      body: `${formatNumber(snackShare * 100, 0)} % der Einträge sind Snacks. Mehr Struktur bei Hauptmahlzeiten kann helfen.`,
    });
  }

  // Weekend vs weekday already in detectMealPatterns – keep a short radar version
  let weekdaySum = 0;
  let weekdayDays = new Set<string>();
  let weekendSum = 0;
  let weekendDays = new Set<string>();
  for (const meal of meals) {
    const local = zoned(meal.consumedAt);
    const key = dayKey(meal.consumedAt);
    const dow = getDay(local);
    if (dow === 0 || dow === 6) {
      weekendSum += meal.calories;
      weekendDays.add(key);
    } else {
      weekdaySum += meal.calories;
      weekdayDays.add(key);
    }
  }
  if (weekdayDays.size >= 2 && weekendDays.size >= 1) {
    const delta = weekendSum / weekendDays.size - weekdaySum / weekdayDays.size;
    if (Math.abs(delta) >= 150) {
      items.push({
        title: "Wochenende",
        body:
          delta > 0
            ? `Wochenende Ø +${formatNumber(delta, 0)} kcal vs. Werktag.`
            : `Wochenende Ø ${formatNumber(delta, 0)} kcal vs. Werktag.`,
      });
    }
  }

  return items.slice(0, 4);
}
