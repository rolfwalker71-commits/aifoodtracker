"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatNumber } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  _count: { meals: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.status === 403 || response.status === 401) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const data = await response.json().catch(() => ({}));
    setUsers(data.users || []);
    setForbidden(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(
    id: string,
    body: { isActive?: boolean; role?: "USER" | "ADMIN"; password?: string },
  ) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.error || "Änderung fehlgeschlagen");
        return;
      }
      toast.success("Gespeichert");
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function createInviteForAdmin(event: FormEvent) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const note = String(form.get("note") || "").trim();
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || "Admin-Einladung" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error || "Einladung fehlgeschlagen");
      return;
    }
    toast.success(`Code: ${data.code}`);
    try {
      await navigator.clipboard.writeText(data.code);
    } catch {
      /* ignore */
    }
    (event.currentTarget as HTMLFormElement).reset();
  }

  if (forbidden) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          Kein Admin-Zugriff. Melde dich neu an, falls du gerade erst zum Admin
          ernannt wurdest.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Zum Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Benutzerverwaltung
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accounts aktivieren/deaktivieren, Passwörter setzen, Admins verwalten.
          Neue User kommen nur über Einladungscodes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Einladung erzeugen</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={createInviteForAdmin}>
            <Input name="note" placeholder="Notiz (optional)" className="sm:flex-1" />
            <Button type="submit">Code erzeugen</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Laden…" : `${formatNumber(users.length, 0)} Benutzer`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="space-y-3 rounded-2xl border border-border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold break-words">
                    {user.name || "Ohne Name"}
                  </p>
                  <p className="text-sm text-muted-foreground break-all">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user.role} · {user._count.meals} Mahlzeiten · seit{" "}
                    {new Date(user.createdAt).toLocaleDateString("de-CH")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${user.id}`} className="text-xs">
                    Aktiv
                  </Label>
                  <Switch
                    id={`active-${user.id}`}
                    checked={user.isActive}
                    disabled={busyId === user.id}
                    onCheckedChange={(checked) =>
                      void patchUser(user.id, { isActive: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {user.role === "ADMIN" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === user.id}
                    onClick={() => void patchUser(user.id, { role: "USER" })}
                  >
                    Admin entziehen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === user.id}
                    onClick={() => void patchUser(user.id, { role: "ADMIN" })}
                  >
                    Zum Admin machen
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="space-y-1 sm:flex-1">
                  <Label htmlFor={`pw-${user.id}`}>Neues Passwort setzen</Label>
                  <Input
                    id={`pw-${user.id}`}
                    type="password"
                    minLength={6}
                    value={passwordDrafts[user.id] || ""}
                    onChange={(e) =>
                      setPasswordDrafts((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                    placeholder="mind. 6 Zeichen"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    busyId === user.id ||
                    !(passwordDrafts[user.id] || "").trim() ||
                    (passwordDrafts[user.id] || "").length < 6
                  }
                  onClick={() =>
                    void patchUser(user.id, {
                      password: passwordDrafts[user.id],
                    })
                  }
                >
                  Passwort speichern
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
