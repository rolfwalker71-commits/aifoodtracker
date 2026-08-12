"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MealAnalysisResult } from "@/lib/openai";

type Props = {
  onAnalyzed: (result: MealAnalysisResult, imagePath: string) => void;
};

export function CameraCapture({ onAnalyzed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
      onAnalyzed(data.analysis as MealAnalysisResult, data.imagePath as string);
      toast.success("KI-Analyse abgeschlossen – bitte prüfen und speichern.");
    } catch (error) {
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40 transition hover:border-primary/50 hover:bg-muted/70"
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
              <p className="text-sm font-medium">Kamera oder Galerie öffnen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Touch-optimiert für unterwegs
              </p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />
        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={!file || analyzing}
          onClick={analyze}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysiere mit GPT-4o…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Mit KI analysieren
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
