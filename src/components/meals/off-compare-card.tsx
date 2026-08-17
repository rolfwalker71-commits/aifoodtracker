"use client";

import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { FoodLookupItem, NutrientValues } from "@/types/nutrition";

type Props = {
  aiName: string;
  aiPer100g: NutrientValues;
  match: FoodLookupItem;
  onUseOff: (item: FoodLookupItem) => void;
  onDismiss: () => void;
};

export function OffCompareCard({
  aiName,
  aiPer100g,
  match,
  onUseOff,
  onDismiss,
}: Props) {
  const off = match.nutrientsPer100g;
  const label = match.brand ? `${match.brand} · ${match.name}` : match.name;

  return (
    <div className="space-y-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <PackageSearch className="h-8 w-8" />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">
          Zur Erkennung „{aiName}“ passt möglicherweise:
        </p>
        <p className="font-display text-xl font-bold leading-snug break-words">
          {label}
        </p>
        {match.barcode ? (
          <p className="text-xs text-muted-foreground">Barcode {match.barcode}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-background/70 px-3 py-3 text-center text-xs sm:text-sm">
        <div className="text-muted-foreground">pro 100 g</div>
        <div className="font-medium">KI</div>
        <div className="font-medium">OFF</div>
        <div className="text-left text-muted-foreground">kcal</div>
        <div>{formatNumber(aiPer100g.calories, 0)}</div>
        <div>{formatNumber(off.calories, 0)}</div>
        <div className="text-left text-muted-foreground">Protein</div>
        <div>{formatNumber(aiPer100g.protein, 1)} g</div>
        <div>{formatNumber(off.protein, 1)} g</div>
        <div className="text-left text-muted-foreground">Kohlenhydrate</div>
        <div>{formatNumber(aiPer100g.carbs, 1)} g</div>
        <div>{formatNumber(off.carbs, 1)} g</div>
        <div className="text-left text-muted-foreground">Fett</div>
        <div>{formatNumber(aiPer100g.fat, 1)} g</div>
        <div>{formatNumber(off.fat, 1)} g</div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full"
          onClick={() => onUseOff(match)}
        >
          OFF-Werte übernehmen
        </Button>
        <Button type="button" variant="outline" className="h-11 w-full" onClick={onDismiss}>
          KI behalten
        </Button>
      </div>
    </div>
  );
}
