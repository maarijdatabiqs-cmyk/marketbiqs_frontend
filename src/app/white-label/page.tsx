"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function WhiteLabelPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("Embedded portal key");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setKeys(await api("/api/agency/white-label-keys"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);
    try {
      const res = await api<any>("/api/agency/white-label-keys", {
        method: "POST",
        body: JSON.stringify({ name, monthly_quota: 10000 }),
      });
      setCreated(res.api_key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="White-label API"
        subtitle="Embed Biqs intelligence into your own portals. Per-use quotas via API keys you issue."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-4">Create embed key</h2>
          <form onSubmit={onCreate} className="space-y-3">
            <div>
              <Label>Key name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Button type="submit">Generate API key</Button>
          </form>
          {created ? (
            <div className="mt-4 rounded-xl bg-[var(--accent-soft)] p-3 text-sm break-all">
              Copy now (shown once): <strong>{created}</strong>
            </div>
          ) : null}
          <div className="mt-6 text-sm text-[var(--muted)] space-y-2">
            <div>GET /api/v1/intelligence/&#123;client_id&#125;/trends</div>
            <div>POST /api/v1/intelligence/&#123;client_id&#125;/run</div>
            <div>POST /api/v1/intelligence/&#123;client_id&#125;/report</div>
            <div>Header: X-API-Key: your_key</div>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">Issued keys</h2>
          {keys.map((k) => (
            <div key={k.id} className="border-b border-[var(--line)] pb-3 mb-3">
              <div className="font-medium">{k.name}</div>
              <div className="text-sm text-[var(--muted)]">
                {k.key_prefix}… · {k.requests_used}/{k.monthly_quota} requests
              </div>
            </div>
          ))}
          {keys.length === 0 ? <p className="text-sm text-[var(--muted)]">No embed keys yet.</p> : null}
        </Card>
      </div>
    </AppShell>
  );
}
