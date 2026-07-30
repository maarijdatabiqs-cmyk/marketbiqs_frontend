"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Button, Card, PageHeader } from "@/components/ui";
import { api, downloadReportPdf } from "@/lib/api";

export default function ReportsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");

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

  return (
    <AppShell>
      <PageHeader
        title="White-label reports"
        subtitle="Client-ready PDFs branded with your agency identity, plus live summaries."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r._k} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{r.client_name}</div>
              <h2 className="font-semibold mt-1">{r.title}</h2>
              <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{r.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Link href={`/clients/${r.client_id}`} className="flex-1 sm:flex-none">
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
      </div>
    </AppShell>
  );
}
