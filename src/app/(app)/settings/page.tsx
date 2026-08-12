"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { triggerMissingImageBackfill } from "@/components/meals/missing-image-backfill";
import { formatNumber } from "@/lib/utils";
import {
  DEFAULT_REMINDERS,
  normalizeReminders,
  type MealReminder,
} from "@/lib/reminders";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import {
  ACTIVITY_LABELS,
  calculateDailyGoals,
  canCalculateGoals,
  type ActivityLevel,
  type Sex,
} from "@/lib/tdee";

type Profile = {
  name: string;
  email: string;
  avatarPath?: string | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  birthYear: number | null;
  activityLevel: ActivityLevel;
  autoCalculateGoals: boolean;
  dailyCaloriesGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  dailyFiberGoal: number;
  dailySugarGoal: number;
  dailySodiumGoal: number;
  dailyPotassiumGoal: number;
  dailyVitaminAGoal: number;
  dailyVitaminCGoal: number;
  dailyVitaminDGoal: number;
  dailyCalciumGoal: number;
  dailyIronGoal: number;
  reminders?: MealReminder[];
  hasOpenAiApiKey: boolean;
  openAiApiKeyMasked?: string;
  profileComplete?: boolean;
  bmr?: number | null;
  tdee?: number | null;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/profile", { cache: "no-store" });
      const data = await response.json();
      if (!cancelled && response.ok) setProfile(data.profile);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewGoals = useMemo(() => {
    if (!profile) return null;
    if (
      !canCalculateGoals({
        sex: profile.sex ?? undefined,
        heightCm: profile.heightCm ?? undefined,
        weightKg: profile.weightKg ?? undefined,
        birthYear: profile.birthYear ?? undefined,
        activityLevel: profile.activityLevel,
      })
    ) {
      return null;
    }
    return calculateDailyGoals({
      sex: profile.sex as Sex,
      heightCm: profile.heightCm as number,
      weightKg: profile.weightKg as number,
      birthYear: profile.birthYear as number,
      activityLevel: profile.activityLevel,
    });
  }, [profile]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        name: profile.name,
        sex: profile.sex,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        birthYear: profile.birthYear,
        activityLevel: profile.activityLevel,
        autoCalculateGoals: profile.autoCalculateGoals,
        dailyCaloriesGoal: profile.dailyCaloriesGoal,
        dailyProteinGoal: profile.dailyProteinGoal,
        dailyCarbsGoal: profile.dailyCarbsGoal,
        dailyFatGoal: profile.dailyFatGoal,
        dailyFiberGoal: profile.dailyFiberGoal,
        dailySugarGoal: profile.dailySugarGoal,
        dailySodiumGoal: profile.dailySodiumGoal,
        dailyPotassiumGoal: profile.dailyPotassiumGoal,
        dailyVitaminAGoal: profile.dailyVitaminAGoal,
        dailyVitaminCGoal: profile.dailyVitaminCGoal,
        dailyVitaminDGoal: profile.dailyVitaminDGoal,
        dailyCalciumGoal: profile.dailyCalciumGoal,
        dailyIronGoal: profile.dailyIronGoal,
        reminders: normalizeReminders(profile.reminders),
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
    toast.success(
      profile.autoCalculateGoals
        ? "Profil gespeichert – Tagesziele neu berechnet"
        : "Einstellungen gespeichert",
    );
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Bitte aktuelles und neues Passwort eingeben");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      toast.error(data.error || "Passwortänderung fehlgeschlagen");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Passwort geändert");
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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Benutzer & Tagesbedarf
        </h1>
        <p className="text-sm text-muted-foreground">
          Körperdaten für die Kalorienberechnung, Passwort und API-Key
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Benutzer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <AvatarUploader
              avatarPath={profile.avatarPath}
              onChange={(avatarPath) =>
                setProfile({ ...profile, avatarPath })
              }
            />
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
            <CardTitle>Körperdaten</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Geschlecht</Label>
              <Select
                value={profile.sex ?? undefined}
                onValueChange={(value) =>
                  setProfile({ ...profile, sex: value as Sex })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Mann</SelectItem>
                  <SelectItem value="FEMALE">Frau</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthYear">Geburtsjahr</Label>
              <Input
                id="birthYear"
                type="number"
                min={1920}
                max={2015}
                value={profile.birthYear ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    birthYear: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                placeholder="z. B. 1990"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightCm">Körpergrösse (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min={100}
                max={250}
                step="any"
                value={profile.heightCm ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    heightCm: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="z. B. 178"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">Gewicht (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                min={30}
                max={400}
                step="any"
                value={profile.weightKg ?? ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    weightKg: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="z. B. 75"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Aktivitätslevel</Label>
              <Select
                value={profile.activityLevel}
                onValueChange={(value) =>
                  setProfile({
                    ...profile,
                    activityLevel: value as ActivityLevel,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(
                    (level) => (
                      <SelectItem key={level} value={level}>
                        {ACTIVITY_LABELS[level]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Ziele automatisch berechnen</p>
                <p className="text-xs text-muted-foreground">
                  Mifflin-St Jeor + Aktivitätsfaktor → Kalorien & Makros
                </p>
              </div>
              <Switch
                checked={profile.autoCalculateGoals}
                onCheckedChange={(checked) =>
                  setProfile({ ...profile, autoCalculateGoals: checked })
                }
              />
            </div>
            {previewGoals && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm sm:col-span-2">
                <p className="font-medium">Vorschau Tagesbedarf</p>
                <p className="mt-1 text-muted-foreground">
                  ca. {formatNumber(previewGoals.dailyCaloriesGoal)} kcal · P{" "}
                  {formatNumber(previewGoals.dailyProteinGoal, 0)} g · K{" "}
                  {formatNumber(previewGoals.dailyCarbsGoal, 0)} g · F{" "}
                  {formatNumber(previewGoals.dailyFatGoal, 0)} g
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tagesziele</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {!profile.autoCalculateGoals && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Automatik aus – Werte manuell anpassen.
              </p>
            )}
            {profile.autoCalculateGoals && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Werden beim Speichern aus den Körperdaten neu gesetzt.
              </p>
            )}
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
                ["dailyVitaminAGoal", "Vitamin A (µg)"],
                ["dailyVitaminCGoal", "Vitamin C (mg)"],
                ["dailyVitaminDGoal", "Vitamin D (µg)"],
                ["dailyCalciumGoal", "Kalzium (mg)"],
                ["dailyIronGoal", "Eisen (mg)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min={1}
                  step="any"
                  disabled={profile.autoCalculateGoals}
                  value={
                    profile.autoCalculateGoals && previewGoals
                      ? previewGoals[key]
                      : profile[key]
                  }
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
            <CardTitle>Erinnerungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lokale Browser-Benachrichtigungen (App muss Permission erlauben).
              Kein Push-Server.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!("Notification" in window)) {
                  toast.error("Benachrichtigungen werden nicht unterstützt");
                  return;
                }
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                  toast.success("Benachrichtigungen erlaubt");
                } else {
                  toast.error("Benachrichtigungen abgelehnt");
                }
              }}
            >
              Permission anfordern
            </Button>
            {(profile.reminders?.length
              ? profile.reminders
              : DEFAULT_REMINDERS
            ).map((reminder) => (
              <div
                key={reminder.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {MEAL_TYPE_LABELS[reminder.mealType]}
                  </p>
                  <Input
                    type="time"
                    className="mt-2 w-32"
                    value={reminder.timeLocal}
                    onChange={(e) => {
                      const reminders = normalizeReminders(
                        profile.reminders,
                      ).map((item) =>
                        item.id === reminder.id
                          ? { ...item, timeLocal: e.target.value }
                          : item,
                      );
                      setProfile({ ...profile, reminders });
                    }}
                  />
                </div>
                <Switch
                  checked={reminder.enabled}
                  onCheckedChange={(checked) => {
                    const reminders = normalizeReminders(profile.reminders).map(
                      (item) =>
                        item.id === reminder.id
                          ? { ...item, enabled: checked }
                          : item,
                    );
                    setProfile({ ...profile, reminders });
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fehlende Bilder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Erzeugt AI-Symbolbilder für Mahlzeiten ohne Datei (z. B. nach
              Deploy). Braucht einen gültigen OpenAI-Key.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.message("Starte Bild-Backfill…");
                triggerMissingImageBackfill();
              }}
            >
              Fehlende Bilder jetzt erzeugen
            </Button>
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
          {busy ? "Speichern…" : "Profil & Ziele speichern"}
        </Button>
      </form>

      <form onSubmit={changePassword}>
        <Card>
          <CardHeader>
            <CardTitle>Passwort ändern</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="outline" disabled={busy}>
              Passwort speichern
            </Button>
          </CardContent>
        </Card>
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
