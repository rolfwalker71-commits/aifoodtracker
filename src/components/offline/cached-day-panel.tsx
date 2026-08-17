"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getDaySnapshot, type DaySnapshot } from "@/lib/offline-db";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Shows IndexedDB day snapshot when the device is offline. */
export function CachedDayPanel() {
  const [online, setOnline] = useState(true);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);

  useEffect(() => {
    async function refresh() {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setSnapshot(null);
        return;
      }
      setSnapshot(await getDaySnapshot());
    }
    void refresh();
    const onOnline = () => void refresh();
    const onOffline = () => void refresh();
    const onSnap = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("nutrisight:offline-snapshot", onSnap);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("nutrisight:offline-snapshot", onSnap);
    };
  }, []);

  if (online || !snapshot) return null;

  return (
    <Card className="border-warning/30 bg-warning/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cache vom {snapshot.dateLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          {formatNumber(Math.round(snapshot.totals.calories))} /{" "}
          {formatNumber(Math.round(snapshot.goals.calories))} kcal
          {snapshot.weightKg != null
            ? ` · ${formatNumber(snapshot.weightKg)} kg`
            : ""}
        </p>
        <ul className="space-y-1 text-muted-foreground">
          {snapshot.meals.slice(0, 8).map((meal) => (
            <li key={meal.id} className="truncate">
              {meal.name} · {formatNumber(Math.round(meal.calories))} kcal
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Stand{" "}
          {format(new Date(snapshot.savedAt), "dd.MM.yyyy HH:mm", {
            locale: de,
          })}{" "}
          · nur Lesen, bis du wieder online bist
        </p>
      </CardContent>
    </Card>
  );
}
