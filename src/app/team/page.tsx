"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
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
    try {
      await api("/api/agency/members", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", full_name: "", password: "", role: "analyst" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Team collaboration"
        subtitle="Invite account managers, strategists, and analysts into the same agency workspace."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-4">Invite teammate</h2>
          <form onSubmit={onInvite} className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>Temporary password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
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
            <Button type="submit">Add member</Button>
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
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
