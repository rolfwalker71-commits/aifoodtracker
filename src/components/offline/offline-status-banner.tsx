"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudOff, Inbox } from "lucide-react";
import {
  getDaySnapshot,
  getOfflineDraftCount,
  type DaySnapshot,
} from "@/lib/offline-db";
import { formatNumber } from "@/lib/utils";

export function OfflineStatusBanner() {
  const [online, setOnline] = useState(true);
  const [count, setCount] = useState(0);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);

  useEffect(() => {
    function refreshOnline() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }
    async function refreshQueue() {
      try {
        setCount(await getOfflineDraftCount());
        setSnapshot(await getDaySnapshot());
      } catch {
        setCount(0);
      }
    }
    refreshOnline();
    void refreshQueue();
    window.addEventListener("online", refreshOnline);
    window.addEventListener("offline", refreshOnline);
    window.addEventListener("nutrisight:offline-queue", () => {
      void refreshQueue();
    });
    window.addEventListener("nutrisight:offline-snapshot", () => {
      void refreshQueue();
    });
    return () => {
      window.removeEventListener("online", refreshOnline);
      window.removeEventListener("offline", refreshOnline);
    };
  }, []);

  if (online && !count) return null;

  return (
    <div className="mb-4 space-y-2">
      {!online ? (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-warning-foreground">
              Offline-Modus
            </p>
            <p className="mt-0.5 text-warning-foreground">
              Erfassungen werden lokal gespeichert. KI und Sync folgen, sobald du
              wieder online bist.
              {snapshot
                ? ` Cache: ${snapshot.dateLabel}, ${formatNumber(Math.round(snapshot.totals.calories))} / ${formatNumber(Math.round(snapshot.goals.calories))} kcal.`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/meals/new"
                className="text-xs font-semibold text-warning-foreground underline-offset-2 hover:underline dark:text-warning-foreground"
              >
                Offline erfassen
              </Link>
              <Link
                href="/offline"
                className="text-xs font-semibold text-warning-foreground underline-offset-2 hover:underline dark:text-warning-foreground"
              >
                Cache ansehen
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {count > 0 ? (
        <Link
          href="/meals/offline"
          className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-3 text-sm transition hover:bg-primary/10"
        >
          <Inbox className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {count} Offline-Entwurf{count === 1 ? "" : "e"}
            </p>
            <p className="text-muted-foreground">
              {online
                ? "Tippen: einzeln mit KI nachbearbeiten und speichern"
                : "Warten auf Netz – danach einzeln nachbearbeiten"}
            </p>
          </div>
        </Link>
      ) : null}
    </div>
  );
}
