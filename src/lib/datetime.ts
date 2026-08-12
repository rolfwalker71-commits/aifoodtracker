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

/** Internal form value: yyyy-MM-dd'T'HH:mm in app timezone. */
export function toFormDateTime(value: Date | string | number = new Date()) {
  return format(toZonedTime(new Date(value), APP_TIMEZONE), "yyyy-MM-dd'T'HH:mm");
}

/** Split internal form value into Swiss display parts. */
export function toSwissDateTimeParts(value: string) {
  const date = parseAppDateTime(value || toFormDateTime());
  return {
    date: format(toZonedTime(date, APP_TIMEZONE), APP_DATE_FORMAT),
    time: format(toZonedTime(date, APP_TIMEZONE), "HH:mm"),
  };
}

/** Combine Swiss dd.MM.yyyy + HH:mm into internal form value. */
export function fromSwissDateTimeParts(
  dateText: string,
  timeText: string,
): string | null {
  const dateMatch = dateText.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const timeMatch = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/** Interpret datetime-local / form values in the app timezone. */
export function parseAppDateTime(value: string): Date {
  if (!value) return new Date();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  // Swiss dd.MM.yyyy[ HH:mm]
  const swiss = value.trim().match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/,
  );
  if (swiss) {
    const pad = (n: string) => n.padStart(2, "0");
    const normalized = `${swiss[3]}-${pad(swiss[2])}-${pad(swiss[1])}T${pad(swiss[4] || "0")}:${pad(swiss[5] || "0")}:00`;
    return fromZonedTime(normalized, APP_TIMEZONE);
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
