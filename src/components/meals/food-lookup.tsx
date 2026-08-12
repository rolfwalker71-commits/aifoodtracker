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

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      setHint(undefined);
      return;
    }

    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/foods/search?q=${encodeURIComponent(query.trim())}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Suche fehlgeschlagen");
        }
        setItems(data.items || []);
        setHint(data.hint);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Suche fehlgeschlagen",
        );
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  async function estimateWithAi() {
    if (query.trim().length < 2) return;
    setEstimating(true);
    try {
      const response = await fetch("/api/foods/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
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
          disabled={query.trim().length < 2 || estimating}
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

        {searching && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Suche in Open Food Facts…
          </p>
        )}

        {!searching && hint && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}

        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background p-3 text-left transition hover:border-primary/40 hover:bg-accent/40"
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
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
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
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
