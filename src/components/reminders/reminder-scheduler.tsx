"use client";

import { useEffect, useRef } from "react";
import {
  parseReminderSettings,
  type ReminderSettings,
} from "@/lib/reminders";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";

const FIRED_KEY = "nutrisight-reminder-fired-v2";

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

async function hasPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

async function maybeNotify(settings: ReminderSettings) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (await hasPushSubscription()) return;

  const { day, time } = localNowParts();
  const fired = firedMap();

  for (const reminder of settings.meals) {
    if (!reminder.enabled) continue;
    if (reminder.timeLocal !== time) continue;
    const key = `${reminder.id}:${reminder.timeLocal}`;
    if (fired[key] === day) continue;

    const label = MEAL_TYPE_LABELS[reminder.mealType];
    try {
      new Notification(`${label} eintragen?`, {
        body: `Zeit für ${label}. Tippe zum Erfassen.`,
        tag: key,
        icon: "/icons/icon-192.png",
      });
      markFired(key, day);
    } catch {
      // ignore
    }
  }
}

export function ReminderScheduler() {
  const settingsRef = useRef<ReminderSettings>(parseReminderSettings(null));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          settingsRef.current = parseReminderSettings(data.profile?.reminders);
        }
      } catch {
        // ignore
      }
    }

    void load();
    void maybeNotify(settingsRef.current);

    const timer = window.setInterval(() => {
      void maybeNotify(settingsRef.current);
    }, 30_000);

    const onFocus = () => {
      void load().then(() => maybeNotify(settingsRef.current));
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
