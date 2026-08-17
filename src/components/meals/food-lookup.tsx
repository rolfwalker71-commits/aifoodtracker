"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils";
import type { FoodLookupItem } from "@/types/nutrition";
import type { MealType } from "@/generated/prisma/client";

type Props = {
  onSelect: (item: FoodLookupItem, mealType?: MealType, notes?: string) => void;
};

export function FoodLookup({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FoodLookupItem[]>([]);
  const [hint, setHint] = useState<string>();
  const [searching, setSearching] = useState(false);
  const [estimating, setEstimating] = useState(false);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2;
  const visibleItems = canSearch ? items : [];
  const visibleHint = canSearch ? hint : undefined;

  useEffect(() => {
    if (!canSearch) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/foods/search?q=${encodeURIComponent(trimmed)}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Suche fehlgeschlagen");
        }
        if (cancelled) return;
        setItems(data.items || []);
        setHint(data.hint);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Suche fehlgeschlagen",
          );
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmed, canSearch]);

  async function estimateWithAi() {
    if (!canSearch) return;
    setEstimating(true);
    try {
      const response = await fetch("/api/foods/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "KI-Schätzung fehlgeschlagen");
      }
      onSelect(data.item as FoodLookupItem, data.mealType, data.notes);
      toast.success("KI-Schätzung geladen – bitte Portion angeben.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "KI-Schätzung fehlgeschlagen",
      );
    } finally {
      setEstimating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Lebensmittel suchen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="food-query">Gericht / Markenprodukt</Label>
          <Input
            id="food-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='z. B. "Findus Lasagne" oder "Spaghetti Bolognese"'
          />
          <p className="text-xs text-muted-foreground">
            Markenprodukte kommen aus{" "}
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Open Food Facts
            </a>
            . Für Hausmannskost kannst du die KI schätzen lassen.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!canSearch || estimating}
          onClick={estimateWithAi}
        >
          {estimating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              KI schätzt Nährwerte…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Mit KI schätzen
            </>
          )}
        </Button>

        {canSearch && searching && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Suche in Open Food Facts…
          </p>
        )}

        {!searching && visibleHint && (
          <p className="text-sm text-muted-foreground">{visibleHint}</p>
        )}

        <div className="space-y-2">
          {visibleItems.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              onClick={() => onSelect(item)}
              className="h-auto w-full items-center justify-start gap-3 p-3 text-left"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    OFF
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {item.brand ? `${item.brand} – ` : ""}
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(item.nutrientsPer100g.calories)} kcal / 100 g
                  {item.servingSizeLabel
                    ? ` · Portion ${item.servingSizeLabel}`
                    : ""}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
