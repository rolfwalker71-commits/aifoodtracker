"use client";

import { FormEvent, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  name: string;
  email: string;
  dailyCaloriesGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyFiberGoal: number;
  dailySugarGoal: number;
  dailySodiumGoal: number;
  dailyPotassiumGoal: number;
  hasOpenAiApiKey: boolean;
  openAiApiKeyMasked?: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/profile");
      const data = await response.json();
      if (response.ok) setProfile(data.profile);
    }
    load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        dailyCaloriesGoal: profile.dailyCaloriesGoal,
        dailyProteinGoal: profile.dailyProteinGoal,
        dailyCarbsGoal: profile.dailyCarbsGoal,
        dailyFatGoal: profile.dailyFatGoal,
        dailyFiberGoal: profile.dailyFiberGoal,
        dailySugarGoal: profile.dailySugarGoal,
        dailySodiumGoal: profile.dailySodiumGoal,
        dailyPotassiumGoal: profile.dailyPotassiumGoal,
        openAiApiKey: apiKey || undefined,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      toast.error(data.error || "Speichern fehlgeschlagen");
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            ...data.profile,
            openAiApiKeyMasked: apiKey
              ? `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}`
              : prev.openAiApiKeyMasked,
          }
        : prev,
    );
    setApiKey("");
    toast.success("Einstellungen gespeichert");
  }

  async function clearKey() {
    setBusy(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearOpenAiApiKey: true }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("API Key konnte nicht entfernt werden");
      return;
    }
    setProfile((prev) =>
      prev
        ? { ...prev, hasOpenAiApiKey: false, openAiApiKeyMasked: "" }
        : prev,
    );
    toast.success("OpenAI API Key entfernt");
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Lade Einstellungen…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Einstellungen
        </h1>
        <p className="text-sm text-muted-foreground">
          Tagesziele und persönlicher OpenAI API Key
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name ?? ""}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>E-Mail</Label>
              <Input value={profile.email} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tagesziele</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["dailyCaloriesGoal", "Kalorien (kcal)"],
                ["dailyProteinGoal", "Protein (g)"],
                ["dailyCarbsGoal", "Kohlenhydrate (g)"],
                ["dailyFatGoal", "Fett (g)"],
                ["dailyFiberGoal", "Ballaststoffe (g)"],
                ["dailySugarGoal", "Zucker (g)"],
                ["dailySodiumGoal", "Natrium (mg)"],
                ["dailyPotassiumGoal", "Kalium (mg)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min={1}
                  value={profile[key]}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      [key]: Number(e.target.value || 0),
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Wird verschlüsselt gespeichert und für GPT-4o Vision genutzt.
              {profile.hasOpenAiApiKey
                ? ` Aktuell: ${profile.openAiApiKeyMasked}`
                : " Noch kein Key hinterlegt."}
            </p>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Neuer API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            {profile.hasOpenAiApiKey && (
              <Button
                type="button"
                variant="outline"
                onClick={clearKey}
                disabled={busy}
              >
                Key entfernen
              </Button>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "Speichern…" : "Einstellungen speichern"}
        </Button>
      </form>

      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Abmelden
      </Button>
    </div>
  );
}
