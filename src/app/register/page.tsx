"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    agency_name: "",
    workspace_mode: "agency",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <div className="font-[family-name:var(--font-display)] text-3xl text-[var(--accent)]">MarketBiqs</div>
        <h1 className="mt-2 text-xl font-semibold">Create your agency workspace</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Self-serve setup in under 10 minutes.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>Your name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div>
            <Label>Work email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
          </div>
          <div>
            <Label>Agency name</Label>
            <Input value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} required />
          </div>
          <div>
            <Label>Workspace mode</Label>
            <select
              className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={form.workspace_mode}
              onChange={(e) => setForm({ ...form, workspace_mode: e.target.value })}
            >
              <option value="agency">Agency (multi-client)</option>
              <option value="creator">Creator (single niche)</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create workspace"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Already have an account? <Link href="/login" className="text-[var(--accent)]">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
