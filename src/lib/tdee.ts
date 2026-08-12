export type Sex = "MALE" | "FEMALE";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "ACTIVE"
  | "VERY_ACTIVE";

export type BodyProfileInput = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  birthYear: number;
  activityLevel: ActivityLevel;
};

export type DailyGoals = {
  dailyCaloriesGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyFiberGoal: number;
  dailySugarGoal: number;
  dailySodiumGoal: number;
  dailyPotassiumGoal: number;
  dailyVitaminAGoal: number;
  dailyVitaminCGoal: number;
  dailyVitaminDGoal: number;
  dailyCalciumGoal: number;
  dailyIronGoal: number;
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sitzend (wenig Bewegung)",
  LIGHT: "Leicht aktiv (1–3x Sport/Woche)",
  MODERATE: "Moderat aktiv (3–5x Sport/Woche)",
  ACTIVE: "Sehr aktiv (6–7x Sport/Woche)",
  VERY_ACTIVE: "Extrem aktiv (körperliche Arbeit / 2x täglich)",
};

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export function ageFromBirthYear(birthYear: number, now = new Date()) {
  return Math.max(15, Math.min(100, now.getFullYear() - birthYear));
}

/** Mifflin-St Jeor BMR in kcal/day */
export function calculateBmr(input: BodyProfileInput) {
  const age = ageFromBirthYear(input.birthYear);
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  return input.sex === "MALE" ? base + 5 : base - 161;
}

/** Total daily energy expenditure */
export function calculateTdee(input: BodyProfileInput) {
  return calculateBmr(input) * ACTIVITY_FACTORS[input.activityLevel];
}

/**
 * Derive daily nutrient goals from body data.
 * Protein ~1.8 g/kg, fat ~27% energy, carbs fill the rest.
 */
export function calculateDailyGoals(input: BodyProfileInput): DailyGoals {
  const tdee = calculateTdee(input);
  const calories = Math.round(tdee / 10) * 10; // nearest 10 kcal

  const protein = Math.round(input.weightKg * 1.8);
  const fat = Math.round((calories * 0.27) / 9);
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));
  const fiber = Math.round((calories / 1000) * 14);
  const sugar = Math.round((calories * 0.1) / 4);
  const sodium = 2300;
  const potassium = input.sex === "MALE" ? 3400 : 2600;
  const vitaminA = input.sex === "MALE" ? 900 : 700;
  const vitaminC = input.sex === "MALE" ? 90 : 75;
  const vitaminD = 20;
  const calcium = 1000;
  const iron = input.sex === "MALE" ? 8 : 18;

  return {
    dailyCaloriesGoal: Math.max(1200, calories),
    dailyProteinGoal: Math.max(40, protein),
    dailyCarbsGoal: Math.max(50, carbs),
    dailyFatGoal: Math.max(30, fat),
    dailyFiberGoal: Math.max(20, fiber),
    dailySugarGoal: Math.max(20, sugar),
    dailySodiumGoal: sodium,
    dailyPotassiumGoal: potassium,
    dailyVitaminAGoal: vitaminA,
    dailyVitaminCGoal: vitaminC,
    dailyVitaminDGoal: vitaminD,
    dailyCalciumGoal: calcium,
    dailyIronGoal: iron,
  };
}

export function canCalculateGoals(input: Partial<BodyProfileInput>) {
  return Boolean(
    input.sex &&
      input.heightCm &&
      input.heightCm > 0 &&
      input.weightKg &&
      input.weightKg > 0 &&
      input.birthYear &&
      input.birthYear > 1900 &&
      input.activityLevel,
  );
}
