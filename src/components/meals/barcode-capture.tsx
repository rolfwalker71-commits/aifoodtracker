"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Barcode, Loader2, Keyboard } from "lucide-react";
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
  onOfflineQueue?: (barcode: string) => Promise<void>;
};

function normalizeBarcode(value: string) {
  return value.replace(/\D/g, "");
}

export function BarcodeCapture({ onSelect, onOfflineQueue }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const handledRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<FoodLookupItem | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopScanner() {
    try {
      controlsRef.current?.stop();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    readerRef.current = null;
    const video = videoRef.current;
    if (video?.srcObject) {
      for (const track of (video.srcObject as MediaStream).getTracks()) {
        track.stop();
      }
      video.srcObject = null;
    }
    setScanning(false);
  }

  async function lookupCode(raw: string) {
    const code = normalizeBarcode(raw);
    if (code.length < 8) {
      toast.error("Barcode zu kurz – bitte erneut scannen oder eingeben.");
      return;
    }
    if (lookingUp) return;

    setLookingUp(true);
    setLastCode(code);
    setPreview(null);

    if (!navigator.onLine && onOfflineQueue) {
      try {
        await onOfflineQueue(code);
        stopScanner();
      } finally {
        setLookingUp(false);
      }
      return;
    }

    try {
      const response = await fetch(
        `/api/foods/barcode?code=${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Produkt nicht gefunden");
      }
      const item = data.item as FoodLookupItem;
      setPreview(item);
      toast.success("Produkt gefunden");
      stopScanner();
    } catch (error) {
      const networkFail =
        !navigator.onLine ||
        (error instanceof TypeError &&
          /fetch|network|failed/i.test(error.message));
      if (networkFail && onOfflineQueue) {
        await onOfflineQueue(code);
        stopScanner();
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Produkt nicht gefunden",
      );
      handledRef.current = false;
    } finally {
      setLookingUp(false);
    }
  }

  async function startScanner() {
    setCameraError(null);
    handledRef.current = false;
    setPreview(null);
    stopScanner();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Kamera nicht verfügbar. Bitte Barcode manuell eingeben.",
      );
      return;
    }

    try {
      setScanning(true);
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoRef.current!,
        (result, _error, ctrl) => {
          controlsRef.current = ctrl;
          if (!result || handledRef.current) return;
          const text = result.getText();
          if (!text) return;
          handledRef.current = true;
          void lookupCode(text);
        },
      );
      controlsRef.current = controls;
    } catch (error) {
      console.error(error);
      setScanning(false);
      setCameraError(
        "Kamera-Zugriff fehlgeschlagen. Erlaube die Kamera oder gib den Code manuell ein.",
      );
    }
  }

  function useProduct() {
    if (!preview) return;
    onSelect(
      preview,
      undefined,
      preview.barcode ? `Barcode ${preview.barcode}` : undefined,
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Barcode className="h-4 w-4 text-primary" />
          Barcode scannen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verpackung scannen – Nährwerte kommen von Open Food Facts. Danach
          Menge bestätigen.
        </p>

        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
          />
          {!scanning ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80 px-4 text-center text-sm text-muted-foreground">
              Kamera starten, um den Strichcode zu lesen
            </div>
          ) : null}
          {lookingUp ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!scanning ? (
            <Button type="button" className="flex-1" onClick={() => void startScanner()}>
              Kamera starten
            </Button>
          ) : (
            <Button type="button" variant="outline" className="flex-1" onClick={stopScanner}>
              Scan stoppen
            </Button>
          )}
        </div>

        {cameraError ? (
          <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {cameraError}
          </p>
        ) : null}

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label htmlFor="manual-barcode" className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5" />
            Oder Code manuell eingeben
          </Label>
          <div className="flex gap-2">
            <Input
              id="manual-barcode"
              inputMode="numeric"
              placeholder="z. B. 7610200012345"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={lookingUp || normalizeBarcode(manualCode).length < 8}
              onClick={() => void lookupCode(manualCode)}
            >
              Suchen
            </Button>
          </div>
          {lastCode ? (
            <p className="text-xs text-muted-foreground">Zuletzt: {lastCode}</p>
          ) : null}
        </div>

        {preview ? (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-3">
            <div className="flex gap-3">
              {preview.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                  OFF
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">
                  {preview.brand ? `${preview.brand} · ` : ""}
                  {preview.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatNumber(preview.nutrientsPer100g.calories, 0)} kcal / 100 g
                  {preview.servingGrams
                    ? ` · Portion ${formatNumber(preview.servingGrams, 0)} g`
                    : ""}
                </p>
              </div>
            </div>
            <Button type="button" className="w-full" onClick={useProduct}>
              Übernehmen und Menge wählen
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
