"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IntelProgressOverlay, IntelRunPhase, useIntelProgress } from "@/components/IntelProgress";
import { Button, Card, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type ClientRow = {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  is_active: boolean;
  rivals_count?: number;
  features_count?: number;
  reports_count?: number;
  alerts_open?: number;
};

export default function TrackerPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [intelName, setIntelName] = useState("");
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelPhase, setIntelPhase] = useState<IntelRunPhase>("running");
  const [intelSuccess, setIntelSuccess] = useState("");
  const [intelError, setIntelError] = useState("");
  const intelProgress = useIntelProgress(intelOpen && intelPhase === "running");

  async function load() {
    const data = await api<ClientRow[]>("/api/clients");
    setClients(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

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
      const res = await api<any>(`/api/clients/${clientId}/auto-run`, { method: "POST" });
      const summary = `Intel complete for ${name} · features ${res.enrich?.features || 0} · rivals ${res.pack?.competitors || 0}`;
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
        title="Multi-brand tracker"
        subtitle="Portfolio view of rivals, features, alerts, and reports — trigger intel per brand without leaving the board."
      />
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {message ? <p className="mb-4 text-[var(--accent)]">{message}</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="font-semibold">{clients.length} brands tracked</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">Counts refresh after each intel run</div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {clients.map((c) => (
            <div
              key={c.id}
              className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                busyId === c.id ? "bg-[var(--accent-soft)]/40" : ""
              }`}
            >
              <Link href={`/clients/${c.id}`} className="min-w-0 transition hover:opacity-80">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-semibold">{c.name}</h2>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      c.is_active ? "text-[var(--accent)]" : "text-red-500"
                    }`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                  {busyId === c.id ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent)]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                      Working
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-[var(--muted)]">
                  {c.industry || "Industry TBD"} · {c.website || "No website"}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  <span>
                    <span className="font-medium text-[var(--ink)]">{c.rivals_count ?? 0}</span> rivals
                  </span>
                  <span>
                    <span className="font-medium text-[var(--ink)]">{c.features_count ?? 0}</span> features
                  </span>
                  <span>
                    <span className="font-medium text-[var(--ink)]">{c.alerts_open ?? 0}</span> alerts
                  </span>
                  <span>
                    <span className="font-medium text-[var(--ink)]">{c.reports_count ?? 0}</span> reports
                  </span>
                </div>
              </Link>
              <div className="flex shrink-0 flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                <Link href={`/clients/${c.id}`} className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto">
                    Open
                  </Button>
                </Link>
                <Button className="w-full sm:w-auto" onClick={() => runIntel(c.id, c.name)} disabled={!!busyId}>
                  {busyId === c.id ? "Working…" : "Run intel"}
                </Button>
              </div>
            </div>
          ))}
          {!clients.length ? (
            <div className="space-y-3 px-5 py-10">
              <p className="text-sm text-[var(--muted)]">No clients yet. Add a brand, then run intel from here.</p>
              <Link href="/clients">
                <Button>Add client</Button>
              </Link>
            </div>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
