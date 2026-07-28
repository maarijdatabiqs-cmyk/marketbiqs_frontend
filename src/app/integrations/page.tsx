"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    base_url: "",
    email: "",
    api_token: "",
    project_key: "",
    epic_name_field: "",
  });

  useEffect(() => {
    api("/api/integrations/jira")
      .then(setStatus)
      .catch((err) => setError(err.message));
  }, []);

  async function onConnect(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api<any>("/api/integrations/jira/connect", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setStatus({ connected: true, project_key: res.project_key, base_url: form.base_url, email: form.email });
      setMessage("Jira connected for your agency. Each client ticket uses your credentials.");
      setForm((f) => ({ ...f, api_token: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Integrations"
        subtitle="Connect your own Jira. Biqs never uses a shared platform Jira key — agencies bring their own."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold mb-2">Jira status</h2>
          {status?.connected ? (
            <div className="text-sm text-[var(--muted)] space-y-1">
              <div>Connected</div>
              <div>Site: {status.base_url}</div>
              <div>Project: {status.project_key}</div>
              <div>Email: {status.email}</div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Not connected yet.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold mb-4">Connect your Jira</h2>
          <form onSubmit={onConnect} className="space-y-3">
            <div>
              <Label>Jira base URL</Label>
              <Input placeholder="https://yourorg.atlassian.net" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} required />
            </div>
            <div>
              <Label>Atlassian email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label>API token</Label>
              <Input type="password" value={form.api_token} onChange={(e) => setForm({ ...form, api_token: e.target.value })} required />
            </div>
            <div>
              <Label>Project key</Label>
              <Input placeholder="MKT" value={form.project_key} onChange={(e) => setForm({ ...form, project_key: e.target.value })} required />
            </div>
            <div>
              <Label>Epic name field (optional)</Label>
              <Input placeholder="customfield_10011" value={form.epic_name_field} onChange={(e) => setForm({ ...form, epic_name_field: e.target.value })} />
            </div>
            <Button type="submit">Save Jira connection</Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
