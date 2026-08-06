"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const me = await login(email, password);
      if (me.needs_bootstrap || !me.agency) {
        router.push("/register?oauth=1");
        return;
      }
      router.push(me.agency.onboarding_completed ? "/dashboard" : "/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <div className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">MarketBiqs</div>
        <h1 className="mt-2 text-xl font-semibold">Sign in to your agency workspace</h1>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="ghost"
            disabled={googleLoading || loading}
            className="w-full"
            onClick={() => void onGoogle()}
          >
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </Button>
          <div className="relative py-1 text-center text-xs uppercase tracking-wide text-[var(--muted)]">
            <span className="bg-[var(--panel)] px-2 relative z-10">or email</span>
            <span className="absolute left-0 right-0 top-1/2 border-t border-[var(--line)]" />
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading || googleLoading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          New agency? <Link href="/register" className="text-[var(--accent)]">Create workspace</Link>
        </p>
      </Card>
    </div>
  );
}
