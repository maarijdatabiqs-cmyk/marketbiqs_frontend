"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "analyst",
  });

  async function load() {
    setMembers(await api("/api/agency/members"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api("/api/agency/members", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", full_name: "", role: "analyst" });
      setMessage("Invite sent. They’ll get a Supabase email to join, then sign in on MarketBiqs.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Team collaboration"
        subtitle="Invite account managers, strategists, and analysts into the same agency workspace."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-4">Invite teammate</h2>
          <form onSubmit={onInvite} className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <Label>Work email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="strategist">Strategist</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <p className="text-xs text-[var(--muted)]">
              They receive an invite email from Supabase Auth. After accepting, they sign in with that email — no temporary password.
            </p>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending invite…" : "Send invite"}
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">Current members</h2>
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.user.full_name}</div>
                  <div className="text-sm text-[var(--muted)] truncate">{m.user.email}</div>
                </div>
                <span className="text-xs uppercase text-[var(--accent)] shrink-0">{m.role}</span>
              </div>
            ))}
            {!members.length ? <p className="text-sm text-[var(--muted)]">No members yet.</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
