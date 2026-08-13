"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils";

type InvitationRow = {
  id: string;
  codePrefix: string;
  note: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export function InviteFriendsCard() {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [freshCode, setFreshCode] = useState<string | null>(null);
  const [ttlDays, setTtlDays] = useState(7);
  const [rows, setRows] = useState<InvitationRow[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/invitations", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    setRows(data.invitations || []);
    if (data.ttlDays) setTtlDays(data.ttlDays);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createInvite() {
    setBusy(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Einladung fehlgeschlagen");
        return;
      }
      setFreshCode(data.code as string);
      setNote("");
      toast.success("Einladungscode erstellt");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code kopiert");
    } catch {
      toast.message(code);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Jemanden einladen
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Erzeuge einen einmaligen Code ({ttlDays} Tage gültig). Der neue User
          legt damit E-Mail + Passwort fest – später reicht der normale Login.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-note">Notiz (optional)</Label>
          <Input
            id="invite-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. für Lisa"
            maxLength={120}
          />
        </div>
        <Button type="button" onClick={() => void createInvite()} disabled={busy}>
          {busy ? "Erstelle…" : "Einladungscode erzeugen"}
        </Button>

        {freshCode ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">
              Code nur jetzt vollständig sichtbar – bitte teilen:
            </p>
            <p className="mt-2 font-mono text-xl font-bold tracking-wider">
              {freshCode}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void copyCode(freshCode)}
            >
              <Copy className="h-4 w-4" />
              Kopieren
            </Button>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {rows.slice(0, 8).map((row) => {
              const used = Boolean(row.usedAt);
              const expired =
                !used && new Date(row.expiresAt).getTime() < Date.now();
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-medium">
                      {row.codePrefix}····
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.note || "Ohne Notiz"} ·{" "}
                      {used
                        ? "verwendet"
                        : expired
                          ? "abgelaufen"
                          : `gültig bis ${new Date(row.expiresAt).toLocaleDateString("de-CH")}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatNumber(
                      Math.max(
                        0,
                        Math.ceil(
                          (new Date(row.expiresAt).getTime() - Date.now()) /
                            86_400_000,
                        ),
                      ),
                      0,
                    )}
                    d
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
