"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MotifCard } from "@/components/push/motif-card";
import { formatNumber } from "@/lib/utils";

export type WeightPoint = {
  kg: number;
  recordedOn: string;
};

export function WeightCard({
  currentKg,
  entries,
}: {
  currentKg: number | null;
  entries: WeightPoint[];
}) {
  const router = useRouter();
  const [kg, setKg] = useState(currentKg ? String(currentKg) : "");
  const [busy, setBusy] = useState(false);

  const previous = entries.length >= 2 ? entries[entries.length - 2] : null;
  const latest = entries.at(-1) ?? null;
  const delta =
    latest && previous ? latest.kg - previous.kg : null;

  const spark = useMemo(() => {
    const slice = entries.slice(-14);
    if (slice.length < 2) return "";
    const min = Math.min(...slice.map((p) => p.kg));
    const max = Math.max(...slice.map((p) => p.kg));
    const span = max - min || 1;
    return slice
      .map((point, i) => {
        const x = (i / (slice.length - 1)) * 120;
        const y = 28 - ((point.kg - min) / span) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [entries]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(String(kg).replace(",", "."));
    if (!Number.isFinite(value) || value < 30) {
      toast.error("Bitte ein gültiges Gewicht eingeben");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kg: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      toast.success("Gewicht gespeichert");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="gewicht">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Gewicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MotifCard kind="weight" />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Aktuell</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {currentKg ? `${formatNumber(currentKg, 1)} kg` : "–"}
            </p>
            {delta !== null ? (
              <p
                className={`text-sm ${
                  delta < 0
                    ? "text-emerald-700"
                    : delta > 0
                      ? "text-amber-700"
                      : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {formatNumber(delta, 1)} kg vs. letzter Eintrag
              </p>
            ) : null}
          </div>
          {spark ? (
            <svg
              viewBox="0 0 120 32"
              className="h-10 w-28 text-primary"
              aria-hidden
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={spark}
              />
            </svg>
          ) : null}
        </div>
        <form className="flex gap-2" onSubmit={onSubmit}>
          <Input
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="kg"
            aria-label="Gewicht in kg"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
