"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MotifCard } from "@/components/push/motif-card";
import { cn, formatNumber } from "@/lib/utils";

export type WeightPoint = {
  id?: string;
  kg: number;
  recordedOn: string;
};

function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

export function WeightCard({
  currentKg,
  entries,
}: {
  currentKg: number | null;
  entries: WeightPoint[];
}) {
  const router = useRouter();
  const [kg, setKg] = useState(currentKg ? String(currentKg) : "");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKg, setEditKg] = useState("");
  const [editDate, setEditDate] = useState("");
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const previous = entries.length >= 2 ? entries[entries.length - 2] : null;
  const latest = entries.at(-1) ?? null;
  const delta = latest && previous ? latest.kg - previous.kg : null;
  const recent = useMemo(() => [...entries].reverse().slice(0, 10), [entries]);

  const spark = useMemo(() => {
    const slice = entries.slice(-14);
    if (slice.length < 2) return "";
    const min = Math.min(...slice.map((p) => p.kg));
    const max = Math.max(...slice.map((p) => p.kg));
    const span = max - min || 1;
    return slice
      .map((point, i) => {
        const x = (i / (slice.length - 1)) * 120;
        const y = 28 - ((point.kg - min) / span) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [entries]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(String(kg).replace(",", "."));
    if (!Number.isFinite(value) || value < 30) {
      toast.error("Bitte ein gültiges Gewicht eingeben");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kg: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      toast.success("Gewicht gespeichert");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  function startEdit(entry: WeightPoint) {
    if (!entry.id) {
      toast.error("Eintrag kann nicht bearbeitet werden");
      return;
    }
    setEditingId(entry.id);
    setEditKg(String(entry.kg));
    setEditDate(entry.recordedOn);
  }

  async function saveEdit() {
    if (!editingId) return;
    const value = Number(String(editKg).replace(",", "."));
    if (!Number.isFinite(value) || value < 30) {
      toast.error("Bitte ein gültiges Gewicht eingeben");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/weight/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kg: value, recordedOn: editDate }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Aktualisieren fehlgeschlagen");
      }
      toast.success("Gewicht aktualisiert");
      setEditingId(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Aktualisieren fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  function requestRemove(id: string | undefined) {
    if (!id) {
      toast.error("Eintrag kann nicht gelöscht werden");
      return;
    }
    setPendingDeleteId(id);
  }

  async function removeEntry(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/weight/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }
      toast.success("Eintrag gelöscht");
      if (editingId === id) setEditingId(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="gewicht">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <MotifCard kind="weight" className="h-10 w-14 sm:h-12 sm:w-16" />
          Gewicht
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Aktuell</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {currentKg ? `${formatNumber(currentKg, 1)} kg` : "–"}
            </p>
            {delta !== null ? (
              <p
                className={`text-sm ${
                  delta < 0
                    ? "text-primary"
                    : delta > 0
                      ? "text-warning"
                      : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {formatNumber(delta, 1)} kg vs. letzter Eintrag
              </p>
            ) : null}
          </div>
          {spark ? (
            <svg
              viewBox="0 0 120 32"
              className="h-10 w-28 text-primary"
              aria-hidden
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={spark}
              />
            </svg>
          ) : null}
        </div>
        <form className="flex gap-2" onSubmit={onSubmit}>
          <Input
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="kg"
            aria-label="Gewicht in kg"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "…" : "Speichern"}
          </Button>
        </form>

        {recent.length ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-between px-2"
              aria-expanded={entriesOpen}
              onClick={() => setEntriesOpen((open) => !open)}
            >
              <span>
                Einträge
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({recent.length})
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  entriesOpen && "rotate-180",
                )}
              />
            </Button>
            {entriesOpen ? (
              <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70">
                {recent.map((entry) => {
                  const isEditing = editingId === entry.id;
                  return (
                    <li
                      key={entry.id || entry.recordedOn}
                      className="px-3 py-2.5"
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="sm:w-40"
                          />
                          <Input
                            inputMode="decimal"
                            value={editKg}
                            onChange={(e) => setEditKg(e.target.value)}
                            className="sm:w-24"
                            aria-label="Gewicht bearbeiten"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              onClick={() => void saveEdit()}
                            >
                              OK
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium tabular-nums">
                              {formatNumber(entry.kg, 1)} kg
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDay(entry.recordedOn)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Eintrag bearbeiten"
                              disabled={busy || !entry.id}
                              onClick={() => startEdit(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Eintrag löschen"
                              disabled={busy || !entry.id}
                              onClick={() => requestRemove(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Gewichtseintrag löschen?"
        description="Dieser Eintrag wird dauerhaft entfernt."
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) void removeEntry(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </Card>
  );
}
