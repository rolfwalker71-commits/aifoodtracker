import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 0) {
  // Node and browsers disagree on the de-CH thousands separator
  // (ASCII ' vs typographic ’) — normalize to avoid hydration mismatches.
  return new Intl.NumberFormat("de-CH", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
    .format(value)
    .replace(/[\u2019\u02BC]/g, "'");
}

export function clampPercent(value: number, max = 100) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, value));
}
