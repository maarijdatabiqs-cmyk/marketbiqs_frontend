"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";

export default function DeliveryPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [reportId, setReportId] = useState("");
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    delivery_channel: "email",
    delivery_emails: "",
    delivery_whatsapp: "",
    delivery_schedule_cron: "0 9 * * 1",
  });

  async function loadClients() {
    const data = await api<any[]>("/api/clients");
    setClients(data);
    if (!clientId && data[0]) setClientId(data[0].id);
  }

  async function loadClientData(id: string) {
    const [client, reps, dels] = await Promise.all([
      api<any>(`/api/clients/${id}`),
      api<any[]>(`/api/clients/${id}/reports`).catch(() => []),
      api<any[]>(`/api/clients/${id}/deliveries`).catch(() => []),
    ]);
    setReports(reps);
    setDeliveries(dels);
    setReportId(reps[0]?.id || "");
    setSettings({
      delivery_channel: client.delivery_channel || "email",
      delivery_emails: (client.delivery_emails || []).join(", "),
      delivery_whatsapp: client.delivery_whatsapp || "",
      delivery_schedule_cron: client.delivery_schedule_cron || "0 9 * * 1",
    });
  }

  useEffect(() => {
    loadClients().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    loadClientData(clientId).catch((err) => setError(err.message));
  }, [clientId]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          delivery_channel: settings.delivery_channel,
          delivery_emails: settings.delivery_emails
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          delivery_whatsapp: settings.delivery_whatsapp || null,
          delivery_schedule_cron: settings.delivery_schedule_cron || null,
        }),
      });
      setStatus("Delivery settings saved (including schedule)");
      await loadClientData(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function sendUpdate() {
    setError("");
    setStatus("");
    try {
      const logs = await api<any[]>(`/api/clients/${clientId}/deliver`, {
        method: "POST",
        body: JSON.stringify({
          report_id: reportId || null,
          channel: channel || null,
          message: message || null,
        }),
      });
      setStatus(`Logged ${logs.length} delivery attempt(s)`);
      await loadClientData(clientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delivery failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Delivery"
        subtitle="Configure email/WhatsApp recipients and send white-label updates with full delivery logs."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {status ? <p className="text-[var(--accent)] mb-4">{status}</p> : null}

      <div className="space-y-4 max-w-3xl">
        <Card>
          <Label>Client</Label>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">Delivery settings</h2>
          <form onSubmit={saveSettings} className="space-y-3">
            <div>
              <Label>Channel</Label>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={settings.delivery_channel}
                onChange={(e) => setSettings({ ...settings, delivery_channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <Label>Emails</Label>
              <Input
                value={settings.delivery_emails}
                onChange={(e) => setSettings({ ...settings, delivery_emails: e.target.value })}
                placeholder="client@brand.com, am@agency.com"
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                value={settings.delivery_whatsapp}
                onChange={(e) => setSettings({ ...settings, delivery_whatsapp: e.target.value })}
                placeholder="+15551234567"
              />
            </div>
            <div>
              <Label>Auto-send schedule (cron)</Label>
              <Input
                value={settings.delivery_schedule_cron}
                onChange={(e) => setSettings({ ...settings, delivery_schedule_cron: e.target.value })}
                placeholder="0 9 * * 1"
              />
              <p className="text-xs text-[var(--muted)] mt-1">
                Example: 0 9 * * 1 = every Monday 09:00 UTC. Leave blank to disable auto-send.
              </p>
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">Send update</h2>
          <div className="space-y-3">
            <div>
              <Label>Report</Label>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
              >
                <option value="">No report / custom message</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Override channel (optional)</Label>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <option value="">Use client default</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <Label>Custom message (optional)</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <Button onClick={sendUpdate}>Send update</Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-3">Delivery logs</h2>
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.id} className="border-b border-[var(--line)] pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {d.channel} → {d.recipient}
                  </div>
                  <span className="text-xs uppercase text-[var(--accent)]">{d.status}</span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1">{d.detail}</p>
              </div>
            ))}
            {!deliveries.length ? <p className="text-sm text-[var(--muted)]">No deliveries logged yet.</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
