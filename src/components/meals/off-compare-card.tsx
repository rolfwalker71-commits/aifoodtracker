"use client";

import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-sky-500/30 bg-sky-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageSearch className="h-4 w-4 text-sky-700 dark:text-sky-300" />
          Open Food Facts Vergleich
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Zur KI-Erkennung „{aiName}“ passt möglicherweise dieses Produkt:
        </p>
        <p className="font-semibold leading-snug">{label}</p>
        {match.barcode ? (
          <p className="text-xs text-muted-foreground">
            Barcode {match.barcode}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-background/70 px-3 py-2 text-center text-xs">
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1"
            onClick={() => onUseOff(match)}
          >
            OFF-Werte übernehmen
          </Button>
          <Button type="button" variant="outline" onClick={onDismiss}>
            KI behalten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
