"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { Card, PageHeader } from "@/components/ui";
import { ChatMessage, api } from "@/lib/api";

/**
 * Client GPT Workspace — isolated chat view for a single brand.
 * Requires an agency session (same login as the rest of the app).
 * For external embeds without login, use white-label API keys (`X-API-Key`).
 */
export default function ClientPortalPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      api<any>(`/api/clients/${clientId}`),
      api<ChatMessage[]>(`/api/clients/${clientId}/chat`).catch(() => []),
      api<any[]>(`/api/clients/${clientId}/reports`).catch(() => []),
    ])
      .then(([c, chat, reps]) => {
        setClient(c);
        setMessages(chat);
        setReports(reps.slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, [clientId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 py-8 sm:py-10">
        <PageHeader
          title={client?.name || "Client workspace"}
          subtitle="Friendly streaming assistant for this brand — rivals, gaps, and weekly changes."
        />
        {error ? (
          <p className="text-red-600">
            {error}
            {/not authenticated|invalid token|401/i.test(error)
              ? " — sign in to MarketBiqs, then open this portal link again."
              : ""}
          </p>
        ) : null}

        <Card>
          <h2 className="mb-3 font-semibold">Recent reports</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="border-b border-[var(--line)] pb-2 text-sm">
                <div className="font-medium">{r.title}</div>
                <p className="line-clamp-2 text-[var(--muted)]">{r.summary}</p>
              </div>
            ))}
            {!reports.length ? <p className="text-sm text-[var(--muted)]">No reports yet.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Ask about this brand</h2>
          {clientId ? (
            <ChatPanel
              clientId={clientId}
              messages={messages}
              onMessagesChange={setMessages}
              variant="textarea"
              listClassName="max-h-96"
              emptyHint="Try: What changed this week? Which competitor launched new features?"
              placeholder="Ask a question about this brand…"
            />
          ) : null}
        </Card>
      </div>
    </div>
  );
}
