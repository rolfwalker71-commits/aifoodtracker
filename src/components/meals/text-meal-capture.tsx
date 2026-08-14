"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FoodLookupItem } from "@/types/nutrition";
import type { MealType } from "@/generated/prisma/client";

type Props = {
  onSelect: (
    item: FoodLookupItem,
    mealType?: MealType,
    notes?: string,
  ) => void;
  onOfflineQueue?: (text: string) => Promise<void>;
};

export function TextMealCapture({ onSelect, onOfflineQueue }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyze() {
    const query = text.trim();
    if (query.length < 3) {
      toast.error("Bitte etwas genauer beschreiben (mind. 3 Zeichen).");
      return;
    }

    if (!navigator.onLine && onOfflineQueue) {
      setBusy(true);
      try {
        await onOfflineQueue(query);
        setText("");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/foods/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "KI-Schätzung fehlgeschlagen");
      }
      onSelect(data.item as FoodLookupItem, data.mealType, data.notes);
    } catch (error) {
      const networkFail =
        !navigator.onLine ||
        (error instanceof TypeError &&
          /fetch|network|failed/i.test(error.message));
      if (networkFail && onOfflineQueue) {
        await onOfflineQueue(query);
        setText("");
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "KI-Schätzung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Freitext beschreiben
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="free-text-meal">Was hast du gegessen?</Label>
          <Textarea
            id="free-text-meal"
            rows={4}
            placeholder="z. B. Eine Schüssel Haferflocken (60 g) mit Milch und Banane"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Offline speichert nur den Text – KI und Menge folgen später online.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy || text.trim().length < 3}
          onClick={() => void analyze()}
        >
          {busy
            ? offline
              ? "Speichere…"
              : "Wird geschätzt…"
            : offline
              ? "Offline speichern"
              : "Mit KI auswerten"}
        </Button>
      </CardContent>
    </Card>
  );
}
