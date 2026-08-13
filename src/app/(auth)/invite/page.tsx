"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InvitePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      code: String(form.get("code") || ""),
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    const response = await fetch("/api/auth/invite/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      toast.error(data.error || "Einladung fehlgeschlagen");
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setBusy(false);

    if (result?.error) {
      toast.success("Konto erstellt – bitte einloggen.");
      router.push("/login");
      return;
    }

    toast.success("Willkommen bei NutriSight");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center animate-rise">
        <BrandMark size="lg" className="mx-auto mb-4" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Einladung einlösen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mit Code Konto anlegen. Danach reicht E-Mail + Passwort zum Login.
        </p>
      </div>
      <Card className="animate-rise-delay border-border/70 shadow-lg shadow-teal-900/5">
        <CardHeader>
          <CardTitle>Zugang freischalten</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="code">Einladungscode</Label>
              <Input
                id="code"
                name="code"
                required
                autoComplete="off"
                placeholder="NS-······"
                className="font-mono uppercase tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Vorname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort wählen</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Wird freigeschaltet…" : "Konto erstellen"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Schon ein Konto?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Zum Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
