"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Card, Label, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";

/**
 * Client GPT Workspace — isolated chat view for a single brand.
 * Agencies open /portal/[id]?token=... or while logged in with agency auth.
 * End clients can use a white-label API key header in embeds; this page uses agency JWT when present.
 */
export default function ClientPortalPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const clientId = params.id;
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      api<any>(`/api/clients/${clientId}`),
      api<any[]>(`/api/clients/${clientId}/chat`).catch(() => []),
      api<any[]>(`/api/clients/${clientId}/reports`).catch(() => []),
    ])
      .then(([c, chat, reps]) => {
        setClient(c);
        setMessages(chat);
        setReports(reps.slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      const pair = await api<any[]>(`/api/clients/${clientId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: input }),
      });
      setMessages((prev) => [...prev, ...pair]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <PageHeader
          title={client?.name || "Client workspace"}
          subtitle="Isolated GPT workspace for this brand — ask about rivals, gaps, and weekly changes."
        />
        {search.get("token") ? (
          <p className="text-xs text-[var(--muted)]">Portal token mode · share only with trusted recipients</p>
        ) : null}
        {error ? <p className="text-red-600">{error}</p> : null}

        <Card>
          <h2 className="font-semibold mb-3">Recent reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="text-sm border-b border-[var(--line)] pb-2">
                <div className="font-medium">{r.title}</div>
                <p className="text-[var(--muted)] line-clamp-2">{r.summary}</p>
              </div>
            ))}
            {!reports.length ? <p className="text-sm text-[var(--muted)]">No reports yet.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold mb-3">Ask about this brand</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
            {messages.map((m) => (
              <div
                key={m.id || `${m.role}-${m.content?.slice(0, 20)}`}
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-8 bg-[var(--accent)] text-white" : "mr-8 bg-[var(--accent-soft)]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {!messages.length ? (
              <p className="text-sm text-[var(--muted)]">
                Try: What changed this week? Which competitor launched new features?
              </p>
            ) : null}
          </div>
          <form onSubmit={onSend} className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} />
            <Button type="submit" disabled={loading}>
              {loading ? "Thinking..." : "Send"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
