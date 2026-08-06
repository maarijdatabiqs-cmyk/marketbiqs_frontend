"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label } from "@/components/ui";

function RegisterForm() {
  const { register, bootstrap, loginWithGoogle, user, needsBootstrap } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthMode = searchParams.get("oauth") === "1" || (Boolean(user) && needsBootstrap);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    agency_name: "",
    workspace_mode: "agency",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (oauthMode) {
        await bootstrap({
          agency_name: form.agency_name,
          workspace_mode: form.workspace_mode,
          full_name: form.full_name || undefined,
        });
      } else {
        await register(form);
      }
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">MarketBiqs</div>
        <h1 className="mt-2 text-xl font-semibold">
          {oauthMode ? "Name your workspace" : "Create your agency workspace"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {oauthMode
            ? "You’re signed in. Choose a workspace name to continue."
            : "Self-serve setup in under 10 minutes."}
        </p>

        {!oauthMode ? (
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
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {!oauthMode ? (
            <>
              <div>
                <Label>Your name</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Work email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <Label>Your name (optional)</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Shown on reports and invites"
              />
            </div>
          )}
          <div>
            <Label>Agency name</Label>
            <Input
              value={form.agency_name}
              onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Workspace mode</Label>
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.workspace_mode}
              onChange={(e) => setForm({ ...form, workspace_mode: e.target.value })}
            >
              <option value="agency">Agency (multi-client)</option>
              <option value="creator">Individual client</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading || googleLoading} className="w-full">
            {loading ? "Creating..." : oauthMode ? "Create workspace" : "Create workspace"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Already have an account? <Link href="/login" className="text-[var(--accent)]">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center text-sm text-[var(--muted)]">Loading…</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
