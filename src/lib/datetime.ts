import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { StatsRange } from "@/types/meals";

export const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Europe/Zurich";

/** Interpret datetime-local values in the app timezone. */
export function parseAppDateTime(value: string): Date {
  if (!value) return new Date();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  const normalized = value.length === 16 ? `${value}:00` : value;
  return fromZonedTime(normalized, APP_TIMEZONE);
}

export function getRangeBoundsInAppTz(
  range: StatsRange,
  reference = new Date(),
) {
  const zoned = toZonedTime(reference, APP_TIMEZONE);

  if (range === "day") {
    return {
      from: fromZonedTime(startOfDay(zoned), APP_TIMEZONE),
      to: fromZonedTime(endOfDay(zoned), APP_TIMEZONE),
    };
  }

  if (range === "week") {
    return {
      from: fromZonedTime(
        startOfWeek(zoned, { weekStartsOn: 1 }),
        APP_TIMEZONE,
      ),
      to: fromZonedTime(endOfWeek(zoned, { weekStartsOn: 1 }), APP_TIMEZONE),
    };
  }

  return {
    from: fromZonedTime(startOfMonth(zoned), APP_TIMEZONE),
    to: fromZonedTime(endOfMonth(zoned), APP_TIMEZONE),
  };
}
