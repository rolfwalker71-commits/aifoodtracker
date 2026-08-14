"use client";

import { useEffect } from "react";
import { saveDaySnapshot, type DaySnapshot } from "@/lib/offline-db";

export function DaySnapshotSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        const response = await fetch("/api/offline/snapshot", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as DaySnapshot;
        await saveDaySnapshot(data);
      } catch {
        // ignore – offline or unauthorized
      }
    }

    void sync();
    const onOnline = () => void sync();
    const onFocus = () => void sync();
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void sync(), 5 * 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
