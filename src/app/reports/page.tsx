"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import { api, downloadReportPdf } from "@/lib/api";

type SortOrder = "newest" | "oldest";

function reportTime(r: { created_at?: string | null }) {
  if (!r.created_at) return 0;
  const t = new Date(r.created_at).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatReportDate(raw?: string | null) {
  if (!raw) return "Date unknown";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "Date unknown";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ReportsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    (async () => {
      try {
        const list = await api<any[]>("/api/clients");
        setClients(list);
        const all = await Promise.all(list.map((c) => api<any[]>(`/api/clients/${c.id}/reports`)));
        setReports(
          all.flat().map((r, idx) => ({
            ...r,
            client_name: list.find((c) => c.id === r.client_id)?.name || "Client",
            _k: `${r.id}-${idx}`,
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let rows = reports;
    if (clientFilter !== "all") {
      rows = rows.filter((r) => r.client_id === clientFilter);
    }
    rows = [...rows].sort((a, b) => {
      const diff = reportTime(a) - reportTime(b);
      return sortOrder === "newest" ? -diff : diff;
    });
    return rows;
  }, [reports, clientFilter, sortOrder]);

  const selectedClientName =
    clientFilter === "all" ? null : clients.find((c) => c.id === clientFilter)?.name || null;

  return (
    <AppShell>
      <PageHeader
        title="All reports"
        subtitle="Every client’s reports in one place — open a client for the full write-up, or download a PDF."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}

      <Card className="mb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Company</Label>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              title="Show reports for one company, or all"
            >
              <option value="all">All companies</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Sort by date</Label>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              title="Newest first or oldest first"
            >
              <option value="newest">Newest → oldest</option>
              <option value="oldest">Oldest → newest</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Showing {filtered.length} report{filtered.length === 1 ? "" : "s"}
          {selectedClientName ? ` for ${selectedClientName}` : ""}
          {reports.length !== filtered.length ? ` (of ${reports.length} total)` : ""}
        </p>
      </Card>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r._k} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{r.client_name}</div>
              <h2 className="font-semibold mt-1">{r.title}</h2>
              <p className="text-xs text-[var(--muted)] mt-1">{formatReportDate(r.created_at)}</p>
              <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{r.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
              <Link href={`/clients/${r.client_id}?tab=reports`} className="flex-1 sm:flex-none">
                <Button variant="ghost" className="w-full sm:w-auto">
                  Open client
                </Button>
              </Link>
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => downloadReportPdf(r.id, `${r.title}.pdf`).catch((e) => setError(e.message))}
              >
                Download PDF
              </Button>
            </div>
          </Card>
        ))}
        {reports.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">
              No reports yet. Open a client and generate one. {clients.length === 0 ? "Add a client first." : ""}
            </p>
          </Card>
        ) : null}
        {reports.length > 0 && filtered.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--muted)]">
              No reports match this company filter. Try “All companies” or pick another client.
            </p>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
