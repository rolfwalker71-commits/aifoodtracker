import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { StatsRange } from "@/types/meals";

export const APP_TIMEZONE =
  process.env.APP_TIMEZONE || "Europe/Zurich";

/** Anzeigeformat für reine Daten */
export const APP_DATE_FORMAT = "dd.MM.yyyy";
/** Anzeigeformat für Datum + Uhrzeit */
export const APP_DATE_TIME_FORMAT = "dd.MM.yyyy HH:mm";

export function formatAppDate(value: Date | string | number) {
  return format(new Date(value), APP_DATE_FORMAT, { locale: de });
}

export function formatAppDateTime(value: Date | string | number) {
  return format(new Date(value), APP_DATE_TIME_FORMAT, { locale: de });
}

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
