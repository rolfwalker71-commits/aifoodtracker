/** Payload of `GET /api/v1/widget` — shared by the Scriptable script and the
 *  in-app preview so both always render the same numbers. */
export type WidgetMeal = {
  id: string;
  name: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  time: string;
  calories: number;
  protein: number;
};

export type WidgetNutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type WidgetDay = {
  date: string;
  label: string;
  calories: number;
  isToday: boolean;
};

export type WidgetPayload = {
  generatedAt: string;
  timezone: string;
  user: { name: string | null };
  goalMode: "LOSE" | "MAINTAIN" | "GAIN";
  today: {
    date: string;
    label: string;
    mealCount: number;
    totals: WidgetNutrients;
    remaining: WidgetNutrients;
    meals: WidgetMeal[];
  };
  goals: WidgetNutrients;
  week: WidgetDay[];
  streak: number;
  weight: { kg: number; recordedOn: string | null; trendKg: number | null } | null;
};
