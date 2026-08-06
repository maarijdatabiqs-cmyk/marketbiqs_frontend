"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IntelProgressOverlay, IntelRunPhase, useIntelProgress } from "@/components/IntelProgress";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api, runClientIntel } from "@/lib/api";

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
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    delivery_emails: "",
  });
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelPhase, setIntelPhase] = useState<IntelRunPhase>("running");
  const [intelName, setIntelName] = useState("");
  const [intelSuccess, setIntelSuccess] = useState("");
  const [intelError, setIntelError] = useState("");
  const intelProgress = useIntelProgress(intelOpen && intelPhase === "running");

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
    setMessage("");
    setBusy(true);
    setIntelName(form.name);
    setIntelSuccess("");
    setIntelError("");
    setIntelPhase("running");
    setIntelOpen(true);
    try {
      const created = await api<Client>("/api/clients", {
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
      const job = await runClientIntel(created.id, {
        competitor_scope: "global",
        competitor_country: "United States",
        competitor_count: 5,
      });
      const pack = job.result_meta?.pack;
      const enrich = job.result_meta?.enrich;
      const summary = `“${created.name}” ready · ${enrich?.features || 0} features · ${pack?.competitors || 0} rivals`;
      setMessage(summary);
      setIntelSuccess(summary);
      setIntelPhase("success");
      setForm({ name: "", industry: "", website: "", delivery_emails: "" });
      setOpen(false);
      await load();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Failed";
      setError(detail);
      setIntelError(detail);
      setIntelPhase("error");
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function runIntel(clientId: string, name: string) {
    setBusyId(clientId);
    setIntelName(name);
    setError("");
    setMessage("");
    setIntelSuccess("");
    setIntelError("");
    setIntelPhase("running");
    setIntelOpen(true);
    try {
      const job = await runClientIntel(clientId, {
        competitor_scope: "global",
        competitor_country: "United States",
        competitor_count: 5,
      });
      const pack = job.result_meta?.pack;
      const enrich = job.result_meta?.enrich;
      const summary = `Intel complete for ${name} · features ${enrich?.features || 0} · rivals ${pack?.competitors || 0}`;
      setMessage(summary);
      setIntelSuccess(summary);
      setIntelPhase("success");
      await load();
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Intel run failed";
      setError(detail);
      setIntelError(detail);
      setIntelPhase("error");
    } finally {
      setBusyId("");
    }
  }

  const isBusy = busy || !!busyId;

  return (
    <AppShell>
      <IntelProgressOverlay
        open={intelOpen}
        phase={intelPhase}
        clientName={intelName}
        stepIndex={intelProgress.stepIndex}
        progress={intelProgress.progress}
        elapsedMs={intelProgress.elapsedMs}
        tipIndex={intelProgress.tipIndex}
        successMessage={intelSuccess}
        errorMessage={intelError}
        onDismiss={() => setIntelOpen(false)}
      />
      <PageHeader
        title="Clients"
        subtitle="Add a brand, open its workspace, or check competitors from here — no separate tracker needed."
        actions={<Button onClick={() => setOpen((v) => !v)}>{open ? "Close form" : "Add client"}</Button>}
      />
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {message ? <p className="mb-4 text-[var(--accent)]">{message}</p> : null}

      {open ? (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">New client</h2>
          <form onSubmit={onCreate} className="max-w-2xl space-y-4">
            <div>
              <Label>Client name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
                required
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div>
              <Label>Delivery emails</Label>
              <Input
                value={form.delivery_emails}
                onChange={(e) => setForm({ ...form, delivery_emails: e.target.value })}
                placeholder="client@brand.com, am@agency.com"
              />
            </div>
            <p className="text-sm text-[var(--muted)]">
              Saving starts rival tracking. You can also check competitors again anytime from the list below.
            </p>
            <Button type="submit" disabled={isBusy}>
              {busy ? "Working…" : "Create & check competitors"}
            </Button>
          </form>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <div className="font-semibold">{clients.length} clients</div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">
              Open a client for full details, or check competitors without leaving this page
            </div>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {clients.map((c) => (
            <div key={c.id} className="px-5 py-4 transition hover:bg-black/[0.02]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/clients/${c.id}`} className="truncate font-semibold hover:text-[var(--accent)]">
                      {c.name}
                    </Link>
                    <span
                      className={`text-[10px] uppercase tracking-wide ${
                        c.is_active ? "text-[var(--accent)]" : "text-red-500"
                      }`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">
                    {c.industry || "Industry TBD"} · {c.website || "No website"} · delivery {c.delivery_channel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                    <span>
                      <strong className="text-[var(--ink)]">{c.rivals_count ?? 0}</strong> competitors
                    </span>
                    <span>
                      <strong className="text-[var(--ink)]">{c.features_count ?? 0}</strong> features
                    </span>
                    <span>
                      <strong className="text-[var(--ink)]">{c.alerts_open ?? 0}</strong> warnings
                    </span>
                    <span>
                      <strong className="text-[var(--ink)]">{c.reports_count ?? 0}</strong> reports
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={`/clients/${c.id}`}>
                    <Button variant="ghost" className="!px-3 !py-2 text-sm">
                      Open
                    </Button>
                  </Link>
                  <Button
                    className="!px-3 !py-2 text-sm"
                    onClick={() => runIntel(c.id, c.name)}
                    disabled={isBusy}
                    title="Check competitors"
                  >
                    {busyId === c.id ? (
                      "Working…"
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Radar size={14} /> Check competitors
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!clients.length ? (
            <div className="px-5 py-10 text-sm text-[var(--muted)]">No clients yet. Add your first brand above.</div>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
