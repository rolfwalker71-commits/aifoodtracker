import type { MealType } from "@/generated/prisma/client";

type MealLike = {
  id: string;
  name: string;
  calories: number;
  mealType: MealType;
  imagePath?: string | null;
  portionSize?: string | null;
  consumedAt: Date | string;
};

export type RepeatCandidate = MealLike & { sourceLabel: string };

export function pickRepeatCandidates(params: {
  yesterday: MealLike[];
  recent: MealLike[];
  limit?: number;
}): RepeatCandidate[] {
  const limit = params.limit ?? 8;
  const seen = new Set<string>();
  const out: RepeatCandidate[] = [];

  for (const meal of params.yesterday) {
    const key = meal.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...meal, sourceLabel: "Gestern" });
    if (out.length >= limit) return out;
  }

  for (const meal of params.recent) {
    const key = meal.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...meal, sourceLabel: "Zuletzt" });
    if (out.length >= limit) return out;
  }

  return out;
}
