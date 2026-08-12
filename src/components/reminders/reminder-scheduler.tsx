"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_REMINDERS,
  normalizeReminders,
  type MealReminder,
} from "@/lib/reminders";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";

const FIRED_KEY = "nutrisight-reminder-fired-v1";

function firedMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function markFired(key: string, day: string) {
  const next = { ...firedMap(), [key]: day };
  localStorage.setItem(FIRED_KEY, JSON.stringify(next));
}

function localNowParts() {
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return { day, time };
}

async function maybeNotify(reminders: MealReminder[]) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const { day, time } = localNowParts();
  const fired = firedMap();

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    if (reminder.timeLocal !== time) continue;
    const key = `${reminder.id}:${reminder.timeLocal}`;
    if (fired[key] === day) continue;

    const label = MEAL_TYPE_LABELS[reminder.mealType];
    try {
      new Notification("NutriSight Erinnerung", {
        body: `Zeit für ${label}? Tippe zum Erfassen.`,
        tag: key,
      });
      markFired(key, day);
    } catch {
      // ignore
    }
  }
}

export function ReminderScheduler() {
  const remindersRef = useRef<MealReminder[]>(DEFAULT_REMINDERS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          remindersRef.current = normalizeReminders(data.profile?.reminders);
        }
      } catch {
        // ignore
      }
    }

    void load();
    void maybeNotify(remindersRef.current);

    const timer = window.setInterval(() => {
      void maybeNotify(remindersRef.current);
    }, 30_000);

    const onFocus = () => {
      void load().then(() => maybeNotify(remindersRef.current));
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
