/** Neutraler Portionsanker (g), wenn die Mengen-Confidence niedrig ist. */
export const NEUTRAL_PORTION_GRAMS = 200;

export function roundTo25(grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return NEUTRAL_PORTION_GRAMS;
  return Math.max(25, Math.round(grams / 25) * 25);
}

/**
 * Mischt KI-/Produkt-Schätzung mit dem Neutral-Anker anhand der Mengen-Confidence.
 * suggested = estimate * c + 200 * (1 - c), auf 25 g gerundet.
 */
export function suggestPortionGrams(
  estimateGrams: number | null | undefined,
  portionConfidence: number | null | undefined,
): {
  suggestedGrams: number;
  estimateGrams: number;
  blended: boolean;
  confidence: number;
} {
  const estimate =
    typeof estimateGrams === "number" &&
    Number.isFinite(estimateGrams) &&
    estimateGrams > 0
      ? estimateGrams
      : NEUTRAL_PORTION_GRAMS;
  const confidence =
    typeof portionConfidence === "number" && Number.isFinite(portionConfidence)
      ? Math.min(1, Math.max(0, portionConfidence))
      : 0.5;
  const mixed = estimate * confidence + NEUTRAL_PORTION_GRAMS * (1 - confidence);
  const suggestedGrams = roundTo25(mixed);
  const estimateRounded = roundTo25(estimate);
  return {
    suggestedGrams,
    estimateGrams: estimateRounded,
    blended: suggestedGrams !== estimateRounded,
    confidence,
  };
}
