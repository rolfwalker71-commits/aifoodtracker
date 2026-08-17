"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortionAwareAnalysis } from "@/types/nutrition";

type Props = {
  onAnalyzed: (result: PortionAwareAnalysis, imagePath: string) => void;
  onOfflineQueue?: (file: File) => Promise<void>;
};

export function CameraCapture({ onAnalyzed, onOfflineQueue }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const offline =
    typeof navigator !== "undefined" ? !navigator.onLine : false;

  function onFileChange(selected?: File | null) {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function analyze() {
    if (!file) {
      toast.error("Bitte zuerst ein Foto auswählen.");
      return;
    }

    if (!navigator.onLine && onOfflineQueue) {
      setAnalyzing(true);
      try {
        await onOfflineQueue(file);
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen");
      }
      onAnalyzed(
        data.analysis as PortionAwareAnalysis,
        data.imagePath as string,
      );
    } catch (error) {
      const networkFail =
        !navigator.onLine ||
        (error instanceof TypeError &&
          /fetch|network|failed/i.test(error.message));
      if (networkFail && onOfflineQueue) {
        await onOfflineQueue(file);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : "Analyse fehlgeschlagen",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Foto-Analyse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => galleryRef.current?.click()}
          className="group relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-dashed"
        >
          {preview ? (
            <Image
              src={preview}
              alt="Mahlzeiten-Vorschau"
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <>
              <ImagePlus className="mb-3 h-8 w-8 text-muted-foreground transition group-hover:text-primary" />
              <p className="text-sm font-medium">Foto wählen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Offline: Foto zwischenspeichern, später mit KI bearbeiten
              </p>
            </>
          )}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Kamera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => galleryRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            Galerie
          </Button>
        </div>
        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={!file || analyzing}
          onClick={() => void analyze()}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {offline ? "Speichere offline…" : "Analysiere mit GPT-4o…"}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {offline ? "Offline speichern" : "Mit KI analysieren"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
