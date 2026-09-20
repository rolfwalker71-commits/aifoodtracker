"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Copy, Download, LayoutGrid, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WidgetPreview } from "@/components/settings/widget-preview";
import {
  buildWidgetScript,
  WIDGET_FAMILIES,
  WIDGET_FOCUS_LABELS,
  WIDGET_SCRIPT_NAME,
  type WidgetFamily,
  type WidgetFocus,
} from "@/lib/scriptable";
import { cn } from "@/lib/utils";
import type { WidgetPayload } from "@/types/widget";

const SCRIPTABLE_URL = "https://apps.apple.com/app/scriptable/id1405459188";

/** Shown until the live day loads, and whenever the user has no data yet. */
const SAMPLE: WidgetPayload = {
  generatedAt: new Date(0).toISOString(),
  timezone: "Europe/Zurich",
  user: { name: "Beispiel" },
  goalMode: "MAINTAIN",
  today: {
    date: "2026-01-01",
    label: "Beispieltag",
    mealCount: 3,
    totals: { calories: 1480, protein: 92, carbs: 148, fat: 54, fiber: 21 },
    remaining: { calories: 720, protein: 38, carbs: 92, fat: 16, fiber: 9 },
    meals: [
      { id: "s3", name: "Linsensalat", mealType: "LUNCH", time: "12:40", calories: 520, protein: 26 },
      { id: "s2", name: "Kaffee & Gipfeli", mealType: "SNACK", time: "10:05", calories: 310, protein: 7 },
      { id: "s1", name: "Haferbrei mit Beeren", mealType: "BREAKFAST", time: "07:20", calories: 650, protein: 59 },
    ],
  },
  goals: { calories: 2200, protein: 130, carbs: 240, fat: 70, fiber: 30 },
  week: [
    { date: "2025-12-26", label: "Fr", calories: 2050, isToday: false },
    { date: "2025-12-27", label: "Sa", calories: 2480, isToday: false },
    { date: "2025-12-28", label: "So", calories: 1890, isToday: false },
    { date: "2025-12-29", label: "Mo", calories: 2140, isToday: false },
    { date: "2025-12-30", label: "Di", calories: 1720, isToday: false },
    { date: "2025-12-31", label: "Mi", calories: 2260, isToday: false },
    { date: "2026-01-01", label: "Do", calories: 1480, isToday: true },
  ],
  streak: 6,
  weight: { kg: 78.4, recordedOn: "2026-01-01", trendKg: -0.6 },
};

const FOCUS_OPTIONS: WidgetFocus[] = ["makros", "mahlzeiten", "ring"];

/** useSyncExternalStore needs a subscribe function; the origin never changes. */
const subscribeNever = () => () => {};

/**
 * Builds a ready-to-paste Scriptable script for the home and lock screen, and
 * previews every widget family with the user's own numbers.
 */
export function ScriptableWidgetsCard() {
  // Read the origin without an effect so the server-rendered markup and the
  // first client render agree on the empty string.
  const origin = useSyncExternalStore(
    subscribeNever,
    () => window.location.origin,
    () => "",
  );
  const [baseUrlOverride, setBaseUrlOverride] = useState<string | null>(null);
  const baseUrl = baseUrlOverride ?? origin;
  const [token, setToken] = useState("");
  const [focus, setFocus] = useState<WidgetFocus>("makros");
  const [data, setData] = useState<WidgetPayload>(SAMPLE);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/widget", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: WidgetPayload | null) => {
        if (payload?.today) setData(payload);
      })
      .catch(() => {
        // Preview falls back to the sample day; nothing to report.
      });
    return () => controller.abort();
  }, []);

  const script = useMemo(
    () => buildWidgetScript({ baseUrl, token, focus }),
    [baseUrl, token, focus],
  );

  async function createKey() {
    setCreating(true);
    try {
      const response = await fetch("/api/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Scriptable Widget" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Key konnte nicht erzeugt werden");
      }
      setToken(payload.rawKey as string);
      toast.success("API-Key erzeugt und ins Skript eingesetzt");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Key konnte nicht erzeugt werden",
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script);
      toast.success("Skript kopiert — jetzt in Scriptable einfügen");
    } catch {
      toast.error("Kopieren fehlgeschlagen — bitte «Als Datei» verwenden");
    }
  }

  function downloadScript() {
    const file = new File([script], `${WIDGET_SCRIPT_NAME}.js`, {
      type: "text/javascript",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const homeFamilies = WIDGET_FAMILIES.filter((item) => item.place === "home");
  const lockFamilies = WIDGET_FAMILIES.filter((item) => item.place === "lock");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Widgets für iPhone & iPad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Home- und Sperrbildschirm-Widgets über die kostenlose App{" "}
          <a
            className="text-primary underline underline-offset-2"
            href={SCRIPTABLE_URL}
            target="_blank"
            rel="noreferrer"
          >
            Scriptable
          </a>
          . Das Skript liest deine Tageswerte über einen persönlichen API-Key —
          behandle es wie ein Passwort.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="widgetBaseUrl">Adresse deiner Instanz</Label>
            <Input
              id="widgetBaseUrl"
              value={baseUrl}
              onChange={(event) => setBaseUrlOverride(event.target.value)}
              placeholder="https://nutrisight.example.ch"
              inputMode="url"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Muss vom iPhone aus erreichbar sein — bei einer Instanz im Heimnetz
              also über VPN oder eine öffentliche Adresse.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="widgetToken">API-Key</Label>
            <Input
              id="widgetToken"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="ns_…"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void createKey()}
              disabled={creating}
            >
              <RefreshCw className={cn("h-4 w-4", creating && "animate-spin")} />
              Neuen Key erzeugen
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Was das mittlere und grosse Widget zeigt</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                variant={focus === option ? "default" : "outline"}
                size="sm"
                aria-pressed={focus === option}
                onClick={() => setFocus(option)}
              >
                {WIDGET_FOCUS_LABELS[option]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void copyScript()}>
            <Copy className="h-4 w-4" />
            Skript kopieren
          </Button>
          <Button type="button" variant="outline" onClick={downloadScript}>
            <Download className="h-4 w-4" />
            Als Datei
          </Button>
        </div>

        {!token ? (
          <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            Ohne Key zeigt das Widget nur einen Einrichtungshinweis. Erzeuge
            einen Key oder füge einen vorhandenen ein.
          </p>
        ) : null}

        <details className="glass-soft rounded-2xl px-4 py-3 text-sm leading-relaxed">
          <summary className="min-h-11 cursor-pointer list-item py-2 font-semibold">
            So richtest du es ein
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Scriptable aus dem App Store laden.</li>
            <li>
              Skript kopieren, in Scriptable auf <strong>+</strong> tippen,
              einfügen und oben <strong>{WIDGET_SCRIPT_NAME}</strong> nennen.
            </li>
            <li>
              Home-Bildschirm lange drücken › <strong>Bearbeiten</strong> ›{" "}
              <strong>Widget hinzufügen</strong> › Scriptable › Grösse wählen.
            </li>
            <li>
              Widget lange drücken › <strong>Widget bearbeiten</strong> › Script:{" "}
              <strong>{WIDGET_SCRIPT_NAME}</strong>.
            </li>
            <li>
              Optional unter <strong>Parameter</strong>, mehrere durch Komma
              getrennt: <code>makros</code>, <code>mahlzeiten</code> oder{" "}
              <code>ring</code> für den Inhalt, <code>hell</code> bzw.{" "}
              <code>dunkel</code> für ein festes Farbschema. So reicht ein Skript
              für mehrere Widgets.
            </li>
            <li>
              Sperrbildschirm: gleich vorgehen, beim Anpassen des
              Sperrbildschirms Scriptable wählen.
            </li>
            <li>
              Antippen öffnet die App, der Erfassen-Chip springt direkt in die
              Kamera.
            </li>
          </ol>
        </details>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Home-Bildschirm
          </h3>
          <PreviewRow families={homeFamilies} focus={focus} data={data} />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sperrbildschirm
          </h3>
          <PreviewRow families={lockFamilies} focus={focus} data={data} />
        </section>
      </CardContent>
    </Card>
  );
}

function PreviewRow({
  families,
  focus,
  data,
}: {
  families: { id: WidgetFamily; label: string; hint: string }[];
  focus: WidgetFocus;
  data: WidgetPayload;
}) {
  return (
    <ul className="space-y-5">
      {families.map((family) => (
        <li key={family.id} className="space-y-2">
          <div>
            <p className="text-sm font-semibold">{family.label}</p>
            <p className="text-xs text-muted-foreground">{family.hint}</p>
          </div>
          {/* The iPad widget is wider than a phone screen, so each preview
              scrolls on its own instead of stretching the page. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <WidgetPreview family={family.id} focus={focus} data={data} />
          </div>
        </li>
      ))}
    </ul>
  );
}
