/**
 * One colour per macro, used by both the progress bars and the donut so a
 * nutrient looks the same wherever it appears. `bar` is a Tailwind class (must
 * stay a literal so it survives the build), `css` the value for inline SVG.
 */
export const MACRO_COLORS = {
  calories: { bar: "bg-primary", css: "var(--primary)" },
  protein: { bar: "bg-chart-1", css: "var(--chart-1)" },
  carbs: { bar: "bg-chart-2", css: "var(--chart-2)" },
  fat: { bar: "bg-chart-3", css: "var(--chart-3)" },
  fiber: { bar: "bg-chart-4", css: "var(--chart-4)" },
  sugar: { bar: "bg-chart-5", css: "var(--chart-5)" },
} as const;
