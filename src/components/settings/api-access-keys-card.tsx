"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAppDateTime } from "@/lib/datetime";

const MAX_API_ACCESS_KEYS = 5;

type AccessKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiAccessKeysCard() {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  async function loadKeys() {
    const response = await fetch("/api/access-keys", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || "API-Keys konnten nicht geladen werden");
      return;
    }
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  async function createKey() {
    setBusy(true);
    try {
      const response = await fetch("/api/access-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erzeugen fehlgeschlagen");
      }
      setFreshKey(data.rawKey as string);
      setName("");
      setKeys((prev) => [data.key as AccessKey, ...prev]);
      toast.success("API-Key erzeugt — jetzt kopieren und sicher speichern");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erzeugen fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/access-keys/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Widerruf fehlgeschlagen");
      }
      setKeys((prev) => prev.filter((item) => item.id !== id));
      toast.success("API-Key widerrufen");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Widerruf fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(okMessage);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  const example = `curl -H "Authorization: Bearer ${freshKey || "ns_…"}" \\
  "${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/meals?limit=20"`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          REST-API Zugang
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Erzeuge einen persönlichen API-Key für externe Quellen (Scripts,
          Automationen, andere Apps). Auth:{" "}
          <code className="text-xs">Authorization: Bearer ns_…</code>
        </p>
        <p className="text-sm text-muted-foreground">
          Endpunkte:{" "}
          <code className="text-xs">GET /api/v1/meals</code>,{" "}
          <code className="text-xs">GET /api/v1/meals/:id</code>,{" "}
          <code className="text-xs">GET /api/v1/stats?range=day|week|month</code>
          , <code className="text-xs">GET /api/v1/profile</code>
        </p>

        {freshKey ? (
          <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm font-medium">
              Neuer Key (nur jetzt sichtbar)
            </p>
            <code className="block break-all rounded-lg bg-background/80 px-3 py-2 text-xs">
              {freshKey}
            </code>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void copyText(freshKey, "API-Key in Zwischenablage")
                }
              >
                <Copy className="h-4 w-4" />
                Key kopieren
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setFreshKey(null)}
              >
                Ausblenden
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-background/80 p-3 text-xs leading-relaxed text-muted-foreground">
              {example}
            </pre>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="accessKeyName">Name (optional)</Label>
            <Input
              id="accessKeyName"
              placeholder="z. B. Home Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={busy || keys.length >= MAX_API_ACCESS_KEYS}
            />
          </div>
          <Button
            type="button"
            onClick={() => void createKey()}
            disabled={busy || keys.length >= MAX_API_ACCESS_KEYS}
          >
            Key erzeugen
          </Button>
        </div>

        {keys.length >= MAX_API_ACCESS_KEYS ? (
          <p className="text-xs text-muted-foreground">
            Limit erreicht ({MAX_API_ACCESS_KEYS}). Widerrufe einen Key, um einen
            neuen zu erzeugen.
          </p>
        ) : null}

        <ul className="divide-y divide-border/70 rounded-xl border border-border">
          {keys.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">
              Noch kein API-Key vorhanden.
            </li>
          ) : (
            keys.map((key) => (
              <li
                key={key.id}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">{key.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {key.keyPrefix}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Erstellt {formatAppDateTime(key.createdAt)}
                    {key.lastUsedAt
                      ? ` · zuletzt ${formatAppDateTime(key.lastUsedAt)}`
                      : " · noch nicht genutzt"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  aria-label="Key widerrufen"
                  disabled={busy}
                  onClick={() => void revokeKey(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
