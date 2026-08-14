"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type Status = "loading" | "needs-keys" | "unsupported" | "off" | "on";

export function PushEnableButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const browserOk =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    try {
      const meta = await fetch("/api/push/subscribe", { cache: "no-store" });
      const data = await meta.json().catch(() => ({}));
      if (!meta.ok) {
        setStatus(browserOk ? "off" : "unsupported");
        return;
      }
      if (!data.configured) {
        setStatus("needs-keys");
        return;
      }
      if (!browserOk) {
        setStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setStatus(sub || data.subscribed ? "on" : "off");
    } catch {
      setStatus(browserOk ? "off" : "unsupported");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try {
      const vapid = await fetch("/api/push/vapid", { cache: "no-store" }).then(
        (r) => r.json(),
      );
      if (!vapid.configured || !vapid.publicKey) {
        setStatus("needs-keys");
        toast.error("Push-Keys fehlen auf dem Server (VAPID)");
        return;
      }
      if (!("Notification" in window) || !("PushManager" in window)) {
        setStatus("unsupported");
        toast.error("Dieser Browser unterstützt kein Web Push");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Benachrichtigungen abgelehnt");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        }));
      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Speichern fehlgeschlagen");
      }
      setStatus("on");
      toast.success("Push aktiv");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Push konnte nicht aktiviert werden",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      } else {
        await fetch("/api/push/subscribe", { method: "DELETE" });
      }
      setStatus("off");
      toast.success("Push deaktiviert");
    } catch {
      toast.error("Konnte Push nicht deaktivieren");
    } finally {
      setBusy(false);
    }
  }

  const hint =
    status === "needs-keys"
      ? "Auf dem Server fehlen VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY. Keys mit npx web-push generate-vapid-keys erzeugen und in die .env legen, App neu starten."
      : status === "unsupported"
        ? "Dieser Browser kann kein Web Push. Auf dem Handy: NutriSight auf den Homescreen legen (PWA) und hier nochmals öffnen. Desktop: Chrome/Edge, nicht im Inkognito."
        : status === "on"
          ? "Erinnerungen kommen auch bei geschlossener App."
          : "Tippe auf «Push aktivieren» und erlaube Benachrichtigungen.";

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {status === "on" ? (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void disable()}
        >
          <Bell className="h-4 w-4" />
          Push aktiv
        </Button>
      ) : (
        <Button
          type="button"
          disabled={busy || status === "needs-keys" || status === "unsupported"}
          onClick={() => void enable()}
        >
          <BellOff className="h-4 w-4" />
          {busy ? "Aktiviere…" : "Push aktivieren"}
        </Button>
      )}
    </div>
  );

  if (compact) {
    if (status === "on" || status === "loading") return null;
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Push-Erinnerungen</p>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          </div>
          {actions}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold">Push-Benachrichtigungen</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === "loading" ? "Prüfe Gerät…" : hint}
        </p>
      </div>
      {status === "loading" ? null : actions}
    </div>
  );
}

export function PushSetupCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Push aktivieren</CardTitle>
      </CardHeader>
      <CardContent>
        <PushEnableButton />
      </CardContent>
    </Card>
  );
}
