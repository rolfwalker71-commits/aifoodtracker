export type GoalMode = "LOSE" | "MAINTAIN" | "GAIN";

export const GOAL_MODE_LABELS: Record<GoalMode, string> = {
  LOSE: "Abnehmen",
  MAINTAIN: "Halten",
  GAIN: "Muskelaufbau",
};

export const GOAL_MODE_HINTS: Record<GoalMode, string> = {
  LOSE: "Tipps priorisieren Kalorienspielraum und sättigendes Protein.",
  MAINTAIN: "Ausgewogene Tipps zu Protein, Ballaststoffen und Alltagsrhythmus.",
  GAIN: "Tipps priorisieren Protein und ausreichend Energie.",
};

export function normalizeGoalMode(value: unknown): GoalMode {
  if (value === "LOSE" || value === "GAIN" || value === "MAINTAIN") return value;
  return "MAINTAIN";
}
