"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  flushOfflineMealQueue,
  getOfflineMealQueueCount,
} from "@/lib/offline-meal-queue";

export function OfflineQueueSync() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function refresh() {
      setCount(getOfflineMealQueueCount());
    }

    async function sync() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        refresh();
        return;
      }
      const before = getOfflineMealQueueCount();
      if (!before) {
        refresh();
        return;
      }
      const result = await flushOfflineMealQueue();
      refresh();
      if (result.synced > 0) {
        toast.success(
          result.synced === 1
            ? "1 Offline-Mahlzeit synchronisiert"
            : `${result.synced} Offline-Mahlzeiten synchronisiert`,
        );
      }
    }

    refresh();
    void sync();

    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("nutrisight:offline-queue", refresh);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("nutrisight:offline-queue", refresh);
    };
  }, []);

  if (!count) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md md:bottom-6">
      {count} offline
    </div>
  );
}
