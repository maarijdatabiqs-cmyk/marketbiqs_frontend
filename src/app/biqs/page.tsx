"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Label, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type BiqsStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";

type BiqsTicket = {
  id: string;
  feature_id?: string | null;
  source_ticket_id?: string | null;
  heading: string;
  body: string;
  acceptance_criteria: string[];
  priority: string;
  ticket_type: string;
  labels: string[];
  estimated_effort: string;
  story_points?: number | null;
  why_useful: string;
  competitor_context: string;
  status: BiqsStatus;
  board_order: number;
};

const COLUMNS: { id: BiqsStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "in_review", label: "In review" },
  { id: "done", label: "Done" },
];

const PRIORITY_STYLES: Record<string, string> = {
  highest: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lowest: "bg-slate-50 text-slate-600 border-slate-200",
};

function PriorityTag({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[(priority || "").toLowerCase()] || PRIORITY_STYLES.medium;
  return (
    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style}`}>
      {priority || "medium"}
    </span>
  );
}

export default function BiqsPage() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [tickets, setTickets] = useState<BiqsTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BiqsStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ id: string; name: string }[]>("/api/clients")
      .then((data) => {
        setClients(data);
        const fromQuery = new URLSearchParams(window.location.search).get("client");
        if (fromQuery && data.some((c) => c.id === fromQuery)) setClientId(fromQuery);
        else if (data[0]) setClientId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    api<BiqsTicket[]>(`/api/clients/${clientId}/biqs-tickets`)
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const byStatus = useMemo(() => {
    const grouped: Record<BiqsStatus, BiqsTicket[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const ticket of tickets) {
      (grouped[ticket.status] || grouped.backlog).push(ticket);
    }
    for (const key of Object.keys(grouped) as BiqsStatus[]) {
      grouped[key].sort((a, b) => a.board_order - b.board_order);
    }
    return grouped;
  }, [tickets]);

  async function moveTicket(ticketId: string, status: BiqsStatus) {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === status) return;

    const previous = tickets;
    const boardOrder = byStatus[status].length;
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status, board_order: boardOrder } : t)));
    setError("");
    try {
      await api(`/api/clients/${clientId}/biqs-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, board_order: boardOrder }),
      });
    } catch (err) {
      setTickets(previous);
      setError(err instanceof Error ? err.message : "Could not move ticket");
    }
  }

  function onDrop(status: BiqsStatus) {
    setOverColumn(null);
    const id = dragId;
    setDragId(null);
    if (id) void moveTicket(id, status);
  }

  return (
    <AppShell>
      <PageHeader
        title="Biqs board"
        subtitle="Your built-in tracker. Push a wishlist development plan here instead of Jira, then drag cards across the workflow."
      />
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}

      <Card className="mb-4 max-w-md">
        <Label>Client workspace</Label>
        <select
          className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {!clients.length ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No clients yet. Add a brand first.</p>
        ) : null}
      </Card>

      {loading ? (
        <div className="animate-pulse text-sm text-[var(--muted)]">Loading board...</div>
      ) : tickets.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--muted)]">
            No tickets on this board yet. Open the client → Wishlist → build a plan →{" "}
            <strong className="font-medium text-[var(--ink)]">Add tickets to Biqs</strong>.
          </p>
        </Card>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverColumn(column.id);
                }}
                onDragLeave={() => setOverColumn((c) => (c === column.id ? null : c))}
                onDrop={() => onDrop(column.id)}
                className={`flex w-[17rem] shrink-0 flex-col rounded-2xl border p-3 transition ${
                  overColumn === column.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--line)] bg-[var(--panel)]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {column.label}
                  </div>
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--muted)]">
                    {byStatus[column.id].length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {byStatus[column.id].map((ticket) => (
                    <article
                      key={ticket.id}
                      draggable
                      onDragStart={() => setDragId(ticket.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-xl border border-[var(--line)] bg-white p-3 active:cursor-grabbing ${
                        dragId === ticket.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {ticket.ticket_type}
                        {ticket.estimated_effort ? ` · ${ticket.estimated_effort}` : ""}
                      </div>
                      <h3 className="mt-1 text-sm font-medium leading-snug break-words">{ticket.heading}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PriorityTag priority={ticket.priority} />
                        {ticket.story_points != null ? (
                          <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--muted)]">
                            {ticket.story_points} pts
                          </span>
                        ) : null}
                        {(ticket.labels || []).slice(0, 2).map((label) => (
                          <span
                            key={label}
                            className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 lg:hidden">
                        {COLUMNS.filter((c) => c.id !== ticket.status).map((c) => (
                          <Button
                            key={c.id}
                            variant="ghost"
                            className="!px-2 !py-1 !text-[11px]"
                            onClick={() => moveTicket(ticket.id, c.id)}
                          >
                            {c.label}
                          </Button>
                        ))}
                      </div>
                    </article>
                  ))}
                  {byStatus[column.id].length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--muted)]">
                      Drop here
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
