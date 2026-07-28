"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
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

  async function load() {
    const data = await api<ClientRow[]>("/api/clients");
    setClients(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function runIntel(clientId: string, name: string) {
    setBusyId(clientId);
    setError("");
    setMessage("");
    try {
      const res = await api<any>(`/api/clients/${clientId}/auto-run`, { method: "POST" });
      setMessage(
        `Intel complete for ${name} · features ${res.enrich?.features || 0} · rivals ${res.pack?.competitors || 0}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Intel run failed");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Multi-brand tracker"
        subtitle="Portfolio view of rivals, features, alerts, and reports — trigger intel per brand without leaving the board."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--line)]">
          <div className="font-semibold">{clients.length} brands tracked</div>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            Counts refresh after each intel run
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {clients.map((c) => (
            <div key={c.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/clients/${c.id}`} className="min-w-0 hover:opacity-80 transition">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold truncate">{c.name}</h2>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      c.is_active ? "text-[var(--accent)]" : "text-red-500"
                    }`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1 truncate">
                  {c.industry || "Industry TBD"} · {c.website || "No website"}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)] mt-2">
                  <span>
                    <span className="text-[var(--ink)] font-medium">{c.rivals_count ?? 0}</span> rivals
                  </span>
                  <span>
                    <span className="text-[var(--ink)] font-medium">{c.features_count ?? 0}</span> features
                  </span>
                  <span>
                    <span className="text-[var(--ink)] font-medium">{c.alerts_open ?? 0}</span> alerts
                  </span>
                  <span>
                    <span className="text-[var(--ink)] font-medium">{c.reports_count ?? 0}</span> reports
                  </span>
                </div>
              </Link>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href={`/clients/${c.id}`}>
                  <Button variant="ghost">Open</Button>
                </Link>
                <Button
                  onClick={() => runIntel(c.id, c.name)}
                  disabled={!!busyId}
                >
                  {busyId === c.id ? "Running intel..." : "Run intel"}
                </Button>
              </div>
            </div>
          ))}
          {!clients.length ? (
            <div className="px-5 py-10 space-y-3">
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
