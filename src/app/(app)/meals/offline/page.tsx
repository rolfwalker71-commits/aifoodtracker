"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listOfflineDrafts,
  removeOfflineDraft,
  type OfflineDraft,
} from "@/lib/offline-db";

const KIND_LABEL: Record<OfflineDraft["kind"], string> = {
  photo: "Foto",
  text: "Freitext",
  barcode: "Barcode",
  manual: "Manuell",
};

export default function OfflineDraftsPage() {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setDrafts(await listOfflineDrafts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onQueue = () => void refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("nutrisight:offline-queue", onQueue);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("nutrisight:offline-queue", onQueue);
    };
  }, []);

  async function discard(id: string) {
    await removeOfflineDraft(id);
    toast.success("Entwurf verworfen");
    await refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Offline-Entwürfe
        </h1>
        <p className="text-sm text-muted-foreground">
          Jeder Eintrag wird einzeln mit KI analysiert, Menge geprüft und
          gespeichert – kein automatischer Batch.
        </p>
      </div>

      {!online ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            Du bist offline. Entwürfe ansehen und löschen geht, die KI-Nachbearbeitung
            startet erst wieder mit Netz.
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Entwürfe…</p>
      ) : null}

      {!loading && !drafts.length ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="text-sm text-muted-foreground">
              Keine offenen Entwürfe. Offline erfasste Fotos und Texte erscheinen
              hier.
            </p>
            <Button asChild variant="outline">
              <Link href="/meals/new">Neue Mahlzeit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <Card key={draft.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="min-w-0 truncate">
                  {index + 1}. {draft.label}
                </span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {KIND_LABEL[draft.kind]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {format(new Date(draft.createdAt), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
                {draft.text ? ` · ${draft.text.slice(0, 60)}` : ""}
                {draft.barcode ? ` · ${draft.barcode}` : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void discard(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Weg
                </Button>
                <Button asChild size="sm" disabled={!online}>
                  <Link href={`/meals/new?draft=${encodeURIComponent(draft.id)}`}>
                    Nachbearbeiten
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
