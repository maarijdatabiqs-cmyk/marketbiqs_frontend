"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type Client = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  niche?: string | null;
  is_active: boolean;
  delivery_channel: string;
  rivals_count?: number;
  features_count?: number;
  reports_count?: number;
  tickets_count?: number;
  alerts_open?: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    delivery_emails: "",
  });

  async function load() {
    const data = await api<Client[]>("/api/clients");
    setClients(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          industry: form.industry || null,
          website: form.website || null,
          delivery_emails: form.delivery_emails
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      setForm({ name: "", industry: "", website: "", delivery_emails: "" });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Client portfolio"
        subtitle="One stacked workspace per brand. Add a client, auto-scan rivals, then run the weekly love → tickets → PDF loop."
        actions={<Button onClick={() => setOpen((v) => !v)}>{open ? "Close form" : "Add client"}</Button>}
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}

      {open ? (
        <Card className="mb-6">
          <h2 className="font-semibold mb-4">New client</h2>
          <form onSubmit={onCreate} className="space-y-4 max-w-2xl">
            <div>
              <Label>Client name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" required />
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div>
              <Label>Delivery emails</Label>
              <Input value={form.delivery_emails} onChange={(e) => setForm({ ...form, delivery_emails: e.target.value })} placeholder="client@brand.com, am@agency.com" />
            </div>
            <p className="text-sm text-[var(--muted)]">
              Saving triggers AI profiling and high-risk rival tracking. Tickets wait until you love a feature.
            </p>
            <Button type="submit" disabled={busy}>{busy ? "Creating..." : "Create & run intel"}</Button>
          </form>
        </Card>
      ) : null}

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div>
            <div className="font-semibold">{clients.length} clients</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">Click a row to open the weekly intelligence loop</div>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="block px-5 py-4 hover:bg-black/[0.02] transition"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold truncate">{c.name}</h2>
                    <span className={`text-[10px] uppercase tracking-wide ${c.is_active ? "text-[var(--accent)]" : "text-red-500"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1 truncate">
                    {c.industry || "Industry TBD"} · {c.website || "No website"} · delivery {c.delivery_channel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  <span><strong className="text-[var(--ink)]">{c.rivals_count ?? 0}</strong> rivals</span>
                  <span><strong className="text-[var(--ink)]">{c.features_count ?? 0}</strong> features</span>
                  <span><strong className="text-[var(--ink)]">{c.alerts_open ?? 0}</strong> open alerts</span>
                  <span><strong className="text-[var(--ink)]">{c.tickets_count ?? 0}</strong> tickets</span>
                  <span><strong className="text-[var(--ink)]">{c.reports_count ?? 0}</strong> reports</span>
                </div>
              </div>
            </Link>
          ))}
          {clients.length === 0 ? (
            <div className="px-5 py-10 text-sm text-[var(--muted)]">No clients yet. Add your first brand to start the weekly loop.</div>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
