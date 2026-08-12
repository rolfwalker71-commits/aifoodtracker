/** Deutsche Labels für KI-Konfidenz (0–1). */
export function confidenceLevel(score: number | null | undefined) {
  const value = typeof score === "number" && Number.isFinite(score) ? score : 0.5;
  if (value >= 0.75) {
    return {
      score: value,
      key: "high" as const,
      label: "eher sicher",
      detail: "Schätzung wirkt belastbar – trotzdem kurz prüfen.",
    };
  }
  if (value >= 0.55) {
    return {
      score: value,
      key: "medium" as const,
      label: "mittel sicher",
      detail: "Menge oder Gericht kann abweichen – bitte anpassen.",
    };
  }
  return {
    score: value,
    key: "low" as const,
    label: "unsicher",
    detail: "Bitte Menge und Gericht besonders sorgfältig prüfen.",
  };
}

export function confidencePercent(score: number | null | undefined) {
  const value = typeof score === "number" && Number.isFinite(score) ? score : 0.5;
  return Math.round(value * 100);
}
