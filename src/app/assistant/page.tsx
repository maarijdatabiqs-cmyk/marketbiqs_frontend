"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChatPanel } from "@/components/ChatPanel";
import { Card, PageHeader } from "@/components/ui";
import { ChatMessage, api } from "@/lib/api";

export default function AssistantPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("client");
    api<any[]>("/api/clients")
      .then((data) => {
        setClients(data);
        if (fromQuery && data.some((c) => c.id === fromQuery)) setClientId(fromQuery);
        else if (data[0]) setClientId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    api<ChatMessage[]>(`/api/clients/${clientId}/chat`)
      .then(setMessages)
      .catch((err) => setError(err.message));
  }, [clientId]);

  return (
    <AppShell>
      <PageHeader
        title="Agency AI assistant"
        subtitle="ChatGPT-style briefings with streaming answers — pick a client and ask what’s changing."
      />
      <Card className="mb-4 max-w-4xl">
        <label className="text-xs uppercase tracking-wide text-[var(--muted)]">Client workspace</label>
        <select
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
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
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      <Card className="max-w-4xl">
        {clientId ? (
          <ChatPanel
            clientId={clientId}
            messages={messages}
            onMessagesChange={setMessages}
            emptyHint="No messages yet. Run intelligence first for richer answers, then ask away."
            placeholder="Ask about competitor changes, trends, or sentiment..."
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Select a client to start chatting.</p>
        )}
      </Card>
    </AppShell>
  );
}
