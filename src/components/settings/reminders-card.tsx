"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MotifCard } from "@/components/push/motif-card";
import { PushEnableButton } from "@/components/push/push-enable-button";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import { mealTypeToPushKind, type PushKind } from "@/lib/push-motifs";
import type { ReminderSettings } from "@/lib/reminders";

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export function RemindersCard({
  settings,
  onChange,
}: {
  settings: ReminderSettings;
  onChange: (next: ReminderSettings) => void;
}) {
  async function sendTest(kind: PushKind) {
    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Test fehlgeschlagen");
      return;
    }
    toast.success("Test-Push gesendet");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push & Erinnerungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Web Push kommt auch bei geschlossener PWA. Jede Erinnerung hat eine
          eigene Motivkarte.
        </p>
        <PushEnableButton />

        {settings.meals.map((reminder) => {
          const kind = mealTypeToPushKind(reminder.mealType);
          return (
            <div
              key={reminder.id}
              className="space-y-3 rounded-2xl border border-border/70 p-3"
            >
              <MotifCard
                kind={kind}
                caption={MEAL_TYPE_LABELS[reminder.mealType]}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {MEAL_TYPE_LABELS[reminder.mealType]}
                  </p>
                  <Input
                    type="time"
                    className="mt-2 w-32"
                    value={reminder.timeLocal}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        meals: settings.meals.map((item) =>
                          item.id === reminder.id
                            ? { ...item, timeLocal: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void sendTest(kind)}
                  >
                    Test
                  </Button>
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...settings,
                        meals: settings.meals.map((item) =>
                          item.id === reminder.id
                            ? { ...item, enabled: checked }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="space-y-3 rounded-2xl border border-border/70 p-3">
          <MotifCard kind="rest" caption="Abend-Coach / Restbudget" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Abend-Coach</p>
              <Input
                type="time"
                className="mt-2 w-32"
                value={settings.extras.restCoach.timeLocal}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    extras: {
                      ...settings.extras,
                      restCoach: {
                        ...settings.extras.restCoach,
                        timeLocal: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void sendTest("rest")}
              >
                Test
              </Button>
              <Switch
                checked={settings.extras.restCoach.enabled}
                onCheckedChange={(checked) =>
                  onChange({
                    ...settings,
                    extras: {
                      ...settings.extras,
                      restCoach: {
                        ...settings.extras.restCoach,
                        enabled: checked,
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 p-3">
          <MotifCard kind="weight" caption="Wöchentliches Wiegen" />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Gewicht-Erinnerung</p>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                  value={settings.extras.weeklyWeight.weekday}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      extras: {
                        ...settings.extras,
                        weeklyWeight: {
                          ...settings.extras.weeklyWeight,
                          weekday: Number(e.target.value),
                        },
                      },
                    })
                  }
                >
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  type="time"
                  className="w-32"
                  value={settings.extras.weeklyWeight.timeLocal}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      extras: {
                        ...settings.extras,
                        weeklyWeight: {
                          ...settings.extras.weeklyWeight,
                          timeLocal: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <Label className="text-xs text-muted-foreground">
                Wochentag und Uhrzeit
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void sendTest("weight")}
              >
                Test
              </Button>
              <Switch
                checked={settings.extras.weeklyWeight.enabled}
                onCheckedChange={(checked) =>
                  onChange({
                    ...settings,
                    extras: {
                      ...settings.extras,
                      weeklyWeight: {
                        ...settings.extras.weeklyWeight,
                        enabled: checked,
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
