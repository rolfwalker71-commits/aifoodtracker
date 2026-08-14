"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  getDaySnapshot,
  getOfflineDraftCount,
  type DaySnapshot,
} from "@/lib/offline-db";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  const [online, setOnline] = useState(true);
  const [count, setCount] = useState(0);
  const [snapshot, setSnapshot] = useState<DaySnapshot | null>(null);

  useEffect(() => {
    async function refresh() {
      setOnline(navigator.onLine);
      setCount(await getOfflineDraftCount());
      setSnapshot(await getDaySnapshot());
    }
    void refresh();
    window.addEventListener("online", () => void refresh());
    window.addEventListener("offline", () => void refresh());
    window.addEventListener("nutrisight:offline-queue", () => void refresh());
    window.addEventListener("nutrisight:offline-snapshot", () => void refresh());
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-5 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-primary">NutriSight</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
          {online ? "Wieder online" : "Offline"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {online
            ? "Live-Daten laden wieder. Offene Entwürfe kannst du jetzt nachbearbeiten."
            : "App-Shell und letzter Tagesstand bleiben lokal verfügbar."}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Offline-Entwürfe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {count
              ? `${count} Entwurf${count === 1 ? "" : "e"} warten auf KI, Menge und Speichern.`
              : "Keine offenen Entwürfe."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/meals/new">Erfassen</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/meals/offline">Entwürfe öffnen</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Letzter Tages-Cache</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshot ? (
            <>
              <p className="font-medium">{snapshot.dateLabel}</p>
              <p className="text-muted-foreground">
                {formatNumber(Math.round(snapshot.totals.calories))} /{" "}
                {formatNumber(Math.round(snapshot.goals.calories))} kcal ·{" "}
                {snapshot.meals.length} Mahlzeit
                {snapshot.meals.length === 1 ? "" : "en"}
                {snapshot.weightKg != null
                  ? ` · ${formatNumber(snapshot.weightKg)} kg`
                  : ""}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {snapshot.meals.slice(0, 6).map((meal) => (
                  <li key={meal.id} className="truncate">
                    {meal.name} · {formatNumber(Math.round(meal.calories))} kcal
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Stand{" "}
                {format(new Date(snapshot.savedAt), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Noch kein Cache. Einmal online das Dashboard öffnen.
            </p>
          )}
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
