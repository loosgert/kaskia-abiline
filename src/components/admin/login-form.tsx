"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminTexts, errorTexts } from "@/lib/texts";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.refresh();
        return;
      }
      const data = await response.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : adminTexts.wrongPassword);
    } catch {
      setError(errorTexts.connection);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kaskia-logo.svg" alt="Kaskia" width={74} height={24} className="h-6 w-auto" />
          <h1 className="text-lg font-semibold">{adminTexts.title}</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{adminTexts.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 text-base"
            autoFocus
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !password} className="h-11 w-full text-[15px]">
          {adminTexts.login}
        </Button>
      </form>
    </main>
  );
}
