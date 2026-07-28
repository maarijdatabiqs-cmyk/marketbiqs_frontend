"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function AssistantPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    api<any[]>(`/api/clients/${clientId}/chat`)
      .then(setMessages)
      .catch((err) => setError(err.message));
  }, [clientId]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!clientId || !input.trim()) return;
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
    <AppShell>
      <PageHeader
        title="Agency AI assistant"
        subtitle='Pre-call briefings with client isolation. Ask “What did this client’s top rival change this week?”'
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
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      <Card className="min-h-[420px] flex flex-col max-w-4xl">
        <div className="flex-1 space-y-3 overflow-auto mb-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user" ? "ml-auto bg-[var(--accent)] text-white" : "bg-[var(--accent-soft)] text-[var(--ink)]"
              }`}
            >
              {m.content}
            </div>
          ))}
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No messages yet. Run intelligence first for richer answers.</p>
          ) : null}
        </div>
        <form onSubmit={onSend} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about competitor changes, trends, or sentiment..."
          />
          <Button type="submit" disabled={loading}>
            {loading ? "..." : "Ask"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
