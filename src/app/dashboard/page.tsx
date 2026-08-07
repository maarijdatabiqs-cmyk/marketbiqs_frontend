"use client";

import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  LifeBuoy,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RivalPulseBar } from "@/components/Charts";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type PortfolioRow = {
  id: string;
  name: string;
  industry?: string;
  is_active: boolean;
  rivals: number;
  features: number;
  reports: number;
  tickets: number;
  gaps?: number;
  alerts?: number;
  wishlist?: number;
  last_intel_at?: string | null;
};

type Health = "Needs attention" | "Watch" | "Healthy" | "Paused";
type SortKey = "name" | "health" | "rivals" | "uniqueFeatures";

type Dashboard = {
  clients_count: number;
  recent_insights: { id: string; title: string; body: string; priority: string; client_id: string }[];
  usage: { active_clients: number };
  portfolio?: PortfolioRow[];
};

type EnrichedRow = PortfolioRow & {
  health: Health;
  uniqueFeatures: number;
  threats: number;
  note: string;
  latest: string;
  nextAction: string;
  nextHref: string | null;
  lastScannedLabel: string;
  lastScannedMs: number;
  isStale: boolean;
};

type RowDetails = {
  loading: boolean;
  error?: string;
  competitors: { id: string; name: string }[];
  missing: { title: string; detail?: string }[];
  toBuild: { id: string; name: string }[];
};

const TIP_KEY = "biqs_dashboard_tip_dismissed";
const FILTER_KEY = "biqs_dashboard_filter";
const QUERY_KEY = "biqs_dashboard_query";
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const GUIDE_STEPS = [
  {
    title: "1. Add your clients",
    body: "Go to Clients and create each brand you manage. We’ll start tracking rivals automatically.",
    href: "/clients",
  },
  {
    title: "2. Check competitors",
    body: "Open Clients and click Check competitors on a brand. You’ll get competitors, missing features, warnings, and a report.",
    href: "/clients",
  },
  {
    title: "3. Review this overview",
    body: "Start with red Health rows, use Next action, then open the brand to dig in.",
    href: "/dashboard",
  },
  {
    title: "4. Share with your client",
    body: "Download a white-label PDF from Reports, or open the Client GPT portal for a branded chat.",
    href: "/reports",
  },
  {
    title: "5. Deliver updates",
    body: "Set email or WhatsApp delivery and send scheduled or one-off updates from Delivery.",
    href: "/delivery",
  },
];

const HEALTH_ORDER: Record<Health, number> = {
  "Needs attention": 0,
  Watch: 1,
  Healthy: 2,
  Paused: 3,
};

function healthFor(c: PortfolioRow): Health {
  if (!c.is_active) return "Paused";
  const alerts = c.alerts ?? 0;
  const gaps = c.gaps ?? 0;
  if (alerts >= 5 || gaps >= 8) return "Needs attention";
  if (alerts >= 1 || gaps >= 3) return "Watch";
  return "Healthy";
}

function statusBadge(isActive: boolean) {
  return isActive
    ? "inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]"
    : "inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600";
}

function healthBadge(health: Health) {
  if (health === "Healthy") {
    return "inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]";
  }
  if (health === "Watch") {
    return "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800";
  }
  if (health === "Needs attention") {
    return "inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700";
  }
  return "inline-flex items-center rounded-full bg-black/[0.04] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]";
}

const COLOR_KEY = [
  {
    color: "bg-[var(--accent)]",
    name: "Teal — What you have",
    meaning: "Features this client already offers.",
  },
  {
    color: "bg-amber-700",
    name: "Amber — What you’re missing",
    meaning: "Things competitors have that this client does not have yet.",
  },
  {
    color: "bg-red-600",
    name: "Red — Warnings",
    meaning: "Important competitor strengths this client still needs to catch up on.",
  },
];

const COLUMN_HELP: { label: string; meaning: string }[] = [
  { label: "Status", meaning: "On = we are tracking this client. Off = tracking is paused." },
  {
    label: "Health",
    meaning:
      "Needs attention = act soon. Watch = keep an eye on it. Healthy = looking good. Paused = tracking is off.",
  },
  {
    label: "Competitors",
    meaning: "How many competing brands we found. Click the number or arrow to see their names.",
  },
  {
    label: "Missing & to-build",
    meaning:
      "Things competitors have that you don’t, plus items saved to build later. Click to see the full list.",
  },
  {
    label: "Next step",
    meaning: "The one thing we suggest you do next for this client.",
  },
];

function ColorLegendCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {COLOR_KEY.map((item) => (
        <div key={item.name} className="rounded-xl border border-[var(--line)] bg-white/70 p-3">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 shrink-0 rounded-full ${item.color}`} aria-hidden />
            <p className="text-sm font-semibold text-[var(--ink)]">{item.name}</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{item.meaning}</p>
        </div>
      ))}
    </div>
  );
}

function uniqueFeaturesCount(c: PortfolioRow) {
  return (c.gaps ?? 0) + (c.wishlist ?? 0);
}

function rivalNote(c: PortfolioRow) {
  const gaps = c.gaps ?? 0;
  const alerts = c.alerts ?? 0;
  const wishlist = c.wishlist ?? 0;
  if (gaps > 0) return `${gaps} thing${gaps === 1 ? "" : "s"} competitors have that you don’t`;
  if (alerts > 0) return `${alerts} warning${alerts === 1 ? "" : "s"} to review`;
  if (wishlist > 0) return `${wishlist} item${wishlist === 1 ? "" : "s"} saved to build later`;
  if (c.rivals > 0) return "Looking even with competitors so far";
  return "Check competitors to compare";
}

function nextActionFor(c: PortfolioRow & { health: Health; uniqueFeatures: number }): {
  label: string;
  href: string | null;
} {
  if ((c.rivals ?? 0) === 0 || !c.last_intel_at) {
    return { label: "Check competitors", href: `/clients/${c.id}` };
  }
  if ((c.alerts ?? 0) > 0) {
    return {
      label: `Review ${c.alerts} warning${c.alerts === 1 ? "" : "s"}`,
      href: `/clients/${c.id}?tab=alerts`,
    };
  }
  if ((c.gaps ?? 0) > 0) {
    return {
      label: `See ${c.gaps} missing feature${c.gaps === 1 ? "" : "s"}`,
      href: `/clients/${c.id}?tab=competitors`,
    };
  }
  if ((c.reports ?? 0) > 0) {
    return { label: "Open latest report", href: `/clients/${c.id}?tab=reports` };
  }
  return { label: "Open client", href: `/clients/${c.id}` };
}

function formatLastScanned(iso?: string | null): { label: string; ms: number; isStale: boolean } {
  if (!iso) return { label: "Not checked yet", ms: 0, isStale: false };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { label: "Not checked yet", ms: 0, isStale: false };
  const diffMs = Date.now() - date.getTime();
  const isStale = diffMs > STALE_MS;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return { label: "Just now", ms: date.getTime(), isStale };
  if (mins < 60) return { label: `${mins}m ago`, ms: date.getTime(), isStale };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `${hours}h ago`, ms: date.getTime(), isStale };
  const days = Math.floor(hours / 24);
  if (days < 14) return { label: `${days}d ago`, ms: date.getTime(), isStale };
  return {
    label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    ms: date.getTime(),
    isStale,
  };
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md font-medium outline-none hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
        active ? "text-[var(--ink)]" : "text-[var(--muted)]"
      }`}
    >
      {label}
      {active ? dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
    </button>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading overview">
      <Card className="h-20 bg-black/[0.03]">{"\u00a0"}</Card>
      <Card>
        <div className="mb-4 h-6 w-48 rounded bg-black/[0.06]" />
        <div className="mb-6 h-10 max-w-md rounded-xl bg-black/[0.05]" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-black/[0.04]" />
          ))}
        </div>
      </Card>
    </div>
  );
}

function DashboardHelp() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [topic, setTopic] = useState("Getting started");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!guideOpen && !supportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGuideOpen(false);
        setSupportOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [guideOpen, supportOpen]);

  function openSupport() {
    setGuideOpen(false);
    setSupportOpen((v) => !v);
    setSent(false);
  }

  function submitHelp(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
  }

  return (
    <>
      <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {supportOpen ? (
          <div className="mb-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_16px_48px_rgba(20,35,31,0.18)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--accent-soft)]/60 px-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-[var(--accent)]">
                  <LifeBuoy size={18} />
                  <h3 className="font-semibold text-[var(--ink)]">Help desk</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">Demo support · usually replies in a few minutes</p>
              </div>
              <button
                type="button"
                aria-label="Close support"
                onClick={() => setSupportOpen(false)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-3">
              <div className="rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm text-[var(--ink)]">
                Hi — tell us what you need help with. For demos, pick a topic and send a short note.
              </div>

              {sent ? (
                <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/50 px-3 py-2.5 text-sm text-[var(--ink)]">
                  Thanks — your request was sent to the help desk. We’ll get back shortly.
                  <button
                    type="button"
                    className="mt-2 block text-sm font-medium text-[var(--accent)] hover:underline"
                    onClick={() => setSent(false)}
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form onSubmit={submitHelp} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      Topic
                    </label>
                    <select
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      <option>Getting started</option>
                      <option>Run intel</option>
                      <option>Clients & portfolio</option>
                      <option>Reports & delivery</option>
                      <option>Billing</option>
                      <option>Something else</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      How can we help?
                    </label>
                    <textarea
                      className="min-h-[88px] w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      placeholder="Describe the issue in a sentence or two…"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Send to help desk
                  </Button>
                </form>
              )}

              <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 !py-2 text-xs"
                  onClick={() => {
                    setSupportOpen(false);
                    setGuideOpen(true);
                  }}
                >
                  Open App Guide
                </Button>
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-medium hover:bg-black/5"
                  onClick={() => {
                    setTopic("Getting started");
                    setMessage("How do I add my first client and run intel?");
                    setSent(false);
                  }}
                >
                  Quick question
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSupportOpen(false);
              setGuideOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3.5 py-2.5 text-sm font-medium shadow-sm hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <BookOpen size={16} className="text-[var(--accent)]" />
            App Guide
          </button>
          <button
            type="button"
            aria-label="Open help desk"
            onClick={openSupport}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_10px_28px_rgba(15,118,110,0.35)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            <HelpCircle size={22} />
          </button>
        </div>
      </div>

      {guideOpen ? (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(20,35,31,0.4)] backdrop-blur-[1px]"
            aria-label="Close guide"
            onClick={() => setGuideOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(24rem,100vw)] flex-col bg-[var(--panel)] shadow-[-12px_0_40px_rgba(20,35,31,0.16)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Quick tour</p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">App Guide</h2>
              </div>
              <button
                type="button"
                aria-label="Close App Guide"
                onClick={() => setGuideOpen(false)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {GUIDE_STEPS.map((step) => (
                <div key={step.title} className="rounded-xl border border-[var(--line)] p-4">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--muted)]">{step.body}</p>
                  <Link
                    href={step.href}
                    onClick={() => setGuideOpen(false)}
                    className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    Go there →
                  </Link>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [query, setQuery] = useState("");
  const [prefsReady, setPrefsReady] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("health");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [tipVisible, setTipVisible] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [detailsById, setDetailsById] = useState<Record<string, RowDetails>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  async function loadRowDetails(clientId: string) {
    setDetailsById((prev) => ({
      ...prev,
      [clientId]: {
        loading: true,
        competitors: prev[clientId]?.competitors || [],
        missing: prev[clientId]?.missing || [],
        toBuild: prev[clientId]?.toBuild || [],
      },
    }));
    try {
      const soft = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
      const [comps, gaps, wish] = await Promise.all([
        soft(api<any[]>(`/api/clients/${clientId}/competitors`), []),
        soft(api<any[]>(`/api/clients/${clientId}/gaps`), []),
        soft(api<any[]>(`/api/clients/${clientId}/wishlist`), []),
      ]);
      const missing: { title: string; detail?: string }[] = [];
      for (const gap of gaps || []) {
        const leads = Array.isArray(gap.leading) ? gap.leading.filter(Boolean) : [];
        if (leads.length) {
          for (const lead of leads.slice(0, 4)) {
            missing.push({
              title: String(lead),
              detail: gap.competitor_name ? `vs ${gap.competitor_name}` : undefined,
            });
          }
        } else if (gap.summary) {
          missing.push({
            title: String(gap.summary).slice(0, 120),
            detail: gap.competitor_name ? `vs ${gap.competitor_name}` : undefined,
          });
        } else if (gap.competitor_name) {
          missing.push({ title: `Missing vs ${gap.competitor_name}` });
        }
      }
      setDetailsById((prev) => ({
        ...prev,
        [clientId]: {
          loading: false,
          competitors: (comps || []).map((c: any) => ({ id: c.id, name: c.name })),
          missing: missing.slice(0, 12),
          toBuild: (wish || []).map((f: any) => ({
            id: f.id,
            name: f.name || f.feature_name || "Saved item",
          })),
        },
      }));
    } catch (err) {
      setDetailsById((prev) => ({
        ...prev,
        [clientId]: {
          loading: false,
          error: err instanceof Error ? err.message : "Could not load details",
          competitors: [],
          missing: [],
          toBuild: [],
        },
      }));
    }
  }

  function toggleExpand(clientId: string) {
    setExpandedId((cur) => {
      const next = cur === clientId ? "" : clientId;
      if (next) {
        const cached = detailsById[next];
        if (!cached || cached.error) void loadRowDetails(next);
      }
      return next;
    });
  }

  function DetailsPanels({ clientId }: { clientId: string }) {
    const details = detailsById[clientId];
    if (!details?.loading && !details) {
      return <p className="text-sm text-[var(--muted)]">Opening details…</p>;
    }
    if (details?.loading) {
      return <p className="text-sm text-[var(--muted)] animate-pulse">Loading details…</p>;
    }
    if (details?.error) {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-600">
          <span>{details.error}</span>
          <Button type="button" variant="ghost" className="!py-1 text-xs" onClick={() => loadRowDetails(clientId)}>
            Retry
          </Button>
        </div>
      );
    }
    const competitors = details?.competitors || [];
    const missing = details?.missing || [];
    const toBuild = details?.toBuild || [];
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">Competitors</p>
          {competitors.length ? (
            <ul className="mt-2 space-y-1.5">
              {competitors.map((comp) => (
                <li key={comp.id} className="text-sm text-[var(--ink)]">
                  {comp.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">None found yet.</p>
          )}
          <Link
            href={`/clients/${clientId}?tab=competitors`}
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            See all →
          </Link>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">Missing</p>
          {missing.length ? (
            <ul className="mt-2 space-y-1.5">
              {missing.map((item, i) => (
                <li key={`${item.title}-${i}`} className="text-sm text-[var(--ink)]">
                  {item.title}
                  {item.detail ? <span className="block text-xs text-[var(--muted)]">{item.detail}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Nothing missing right now.</p>
          )}
          <Link
            href={`/clients/${clientId}?tab=competitors`}
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            See gaps →
          </Link>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">To build</p>
          {toBuild.length ? (
            <ul className="mt-2 space-y-1.5">
              {toBuild.map((item) => (
                <li key={item.id} className="text-sm text-[var(--ink)]">
                  {item.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">Nothing saved to build yet.</p>
          )}
          <Link
            href={`/clients/${clientId}?tab=wishlist`}
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Open list →
          </Link>
        </div>
      </div>
    );
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const dash = await api<Dashboard>("/api/agency/dashboard");
      setData(dash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function archiveClient(clientId: string, clientName: string) {
    if (
      !window.confirm(
        `Archive “${clientName}”? Tracking stops and it leaves your active list. Reports stay saved.`,
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await api(`/api/clients/${clientId}`, { method: "DELETE" });
      setMessage(`Archived ${clientName}`);
      if (expandedId === clientId) setExpandedId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive client");
    }
  }

  useEffect(() => {
    load().catch(() => {
      /* error already set */
    });
    try {
      setTipVisible(localStorage.getItem(TIP_KEY) !== "1");
      const savedFilter = localStorage.getItem(FILTER_KEY);
      if (savedFilter === "all" || savedFilter === "attention") setFilter(savedFilter);
      const savedQuery = localStorage.getItem(QUERY_KEY);
      if (savedQuery) setQuery(savedQuery);
    } catch {
      setTipVisible(true);
    }
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    try {
      localStorage.setItem(FILTER_KEY, filter);
      localStorage.setItem(QUERY_KEY, query);
    } catch {
      /* ignore */
    }
  }, [filter, query, prefsReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);


  function dismissTip() {
    setTipVisible(false);
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* ignore */
    }
  }


  const latestByClient = useMemo(() => {
    const map = new Map<string, string>();
    for (const insight of data?.recent_insights || []) {
      if (!map.has(insight.client_id)) map.set(insight.client_id, insight.title);
    }
    return map;
  }, [data?.recent_insights]);

  const enriched = useMemo<EnrichedRow[]>(() => {
    return (data?.portfolio || []).map((c) => {
      const health = healthFor(c);
      const scanned = formatLastScanned(c.last_intel_at);
      const uniqueFeatures = uniqueFeaturesCount(c);
      const next = nextActionFor({ ...c, health, uniqueFeatures });
      return {
        ...c,
        health,
        uniqueFeatures,
        threats: c.alerts ?? 0,
        note: rivalNote(c),
        latest: latestByClient.get(c.id) || "No updates yet — check competitors",
        nextAction: next.label,
        nextHref: next.href,
        lastScannedLabel: scanned.label,
        lastScannedMs: scanned.ms,
        isStale: scanned.isStale,
      };
    });
  }, [data?.portfolio, latestByClient]);

  const needsAttention = useMemo(
    () => enriched.filter((c) => c.health === "Needs attention" || c.health === "Watch"),
    [enriched],
  );


  const visiblePortfolio = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = filter === "attention" ? needsAttention : enriched;
    if (q) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.industry || "").toLowerCase().includes(q) ||
          c.nextAction.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "health") cmp = HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health];
      else if (sortKey === "rivals") cmp = a.rivals - b.rivals;
      else if (sortKey === "uniqueFeatures") cmp = a.uniqueFeatures - b.uniqueFeatures;
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [enriched, needsAttention, filter, query, sortKey, sortDir]);

  const activeClients = data?.usage?.active_clients ?? data?.clients_count ?? enriched.length;
  const totalRivals = enriched.reduce((s, c) => s + c.rivals, 0);
  const totalUnique = enriched.reduce((s, c) => s + c.uniqueFeatures, 0);
  const totalThreats = enriched.reduce((s, c) => s + c.threats, 0);
  const nextClient = needsAttention[0] || enriched[0] || null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "health" ? "asc" : "desc");
    }
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
  }

  function NextActionCell({ c }: { c: EnrichedRow }) {
    return (
      <Link
        href={c.nextHref || `/clients/${c.id}`}
        className="font-medium text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
      >
        {c.nextAction}
      </Link>
    );
  }

  function ActionButtons({ c, compact }: { c: EnrichedRow; compact?: boolean }) {
    const btn = compact ? "!px-2.5 !py-1.5 text-xs" : "!px-3 !py-2 text-xs";
    return (
      <div className="flex flex-wrap gap-1.5">
        <Link href={`/clients/${c.id}`}>
          <Button variant="ghost" className={btn} title="Open client">
            Open
          </Button>
        </Link>
        <Link href={`/clients/${c.id}?tab=reports`}>
          <Button variant="ghost" className={btn} title="Reports">
            <span className="inline-flex items-center gap-1">
              <FileText size={12} /> Reports
            </span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          className={`${btn} !border-red-200 !text-red-700 hover:!bg-red-50`}
          title="Archive client"
          onClick={() => void archiveClient(c.id, c.name)}
        >
          Archive
        </Button>
      </div>
    );
  }

  function rowClass(_c: EnrichedRow) {
    return "border-b border-[var(--line)] last:border-0 align-middle transition-colors hover:bg-black/[0.015]";
  }

  function mobileCardClass(_c: EnrichedRow) {
    return "rounded-xl border border-[var(--line)] p-3 transition-colors";
  }

  return (
    <AppShell>
      <PageHeader
        title="Your clients at a glance"
        subtitle="Plain view of each brand: how they’re doing, what competitors have, and what to do next."
        actions={
          nextClient ? (
            <Link href={nextClient.nextHref || `/clients/${nextClient.id}`}>
              <Button>{needsAttention.length ? "Fix next client" : "Open client"}</Button>
            </Link>
          ) : (
            <Link href="/clients">
              <Button>Add a client</Button>
            </Link>
          )
        }
      />
      {error ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          <Button
            type="button"
            variant="ghost"
            className="!border-red-200 !bg-white !py-1.5 text-xs"
            onClick={() =>
              load().catch(() => {
                /* error set in load */
              })
            }
            disabled={loading}
          >
            {loading ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}

      {loading && !data ? (
        <PortfolioSkeleton />
      ) : data ? (
        <div className="space-y-6">
          {tipVisible && enriched.length > 0 ? (
            <Card className="bg-[var(--accent-soft)]/50 border-[var(--accent)]/20">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-[var(--ink)]">
                  <span className="font-semibold">Tip:</span> start with red or amber Health, then follow{" "}
                  <span className="font-medium">Next step</span>. Open a client to run Check competitors. Press{" "}
                  <kbd className="rounded border border-[var(--line)] bg-white px-1.5 py-0.5 text-xs">/</kbd> to search.
                </p>
                <button
                  type="button"
                  aria-label="Dismiss tip"
                  onClick={dismissTip}
                  className="rounded-lg p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  <X size={16} />
                </button>
              </div>
            </Card>
          ) : null}

          {enriched.length === 0 ? (
            <Card className="py-10 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                Add your first client
              </h2>
              <p className="mt-2 mx-auto max-w-md text-sm text-[var(--muted)]">
                Add a brand, check their competitors once, and this page will show how they’re doing and what to do
                next.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/clients">
                  <Button>Add a client</Button>
                </Link>
                <Link href="/clients">
                  <Button variant="ghost">Back to clients</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <>
              {needsAttention.length > 0 ? (
                <Card className="border-amber-200/80 bg-amber-50/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-amber-950">Needs a closer look</h2>
                      <p className="text-sm text-amber-900/70 mt-1">
                        {needsAttention.length} client{needsAttention.length === 1 ? "" : "s"} have warnings or are
                        missing features vs competitors — start here.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {needsAttention.slice(0, 3).map((c) => (
                        <Link key={c.id} href={c.nextHref || `/clients/${c.id}`}>
                          <Button variant="ghost" className="!border-amber-200 !bg-white/70">
                            {c.name}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : null}

              {enriched.length > 0 ? (
                <Card className="border-[var(--accent)]/20 bg-[var(--accent-soft)]/25">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-semibold text-[var(--ink)]">You vs competitors</h2>
                      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
                        Each bar is one client. More teal is good (what they already have). More amber or red means
                        competitors are ahead — open that client to see details.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      What the colors mean
                    </p>
                    <ColorLegendCards />
                  </div>

                  <div className="mt-5 space-y-3">
                    {visiblePortfolio.slice(0, 8).map((c) => {
                      const you = c.features ?? 0;
                      const gaps = c.gaps ?? 0;
                      const threats = c.threats;
                      return (
                        <div
                          key={`pulse-${c.id}`}
                          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-3 sm:px-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Link
                              href={`/clients/${c.id}?tab=competitors`}
                              className="font-medium hover:text-[var(--accent)]"
                            >
                              {c.name}
                            </Link>
                            <span className="text-xs text-[var(--muted)]">
                              {c.rivals} competitor{c.rivals === 1 ? "" : "s"} found
                            </span>
                          </div>
                          <div className="mt-2.5">
                            <RivalPulseBar features={you} gaps={gaps} threats={threats} />
                          </div>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            <span className="text-[var(--accent)] font-medium">{you}</span> you have
                            <span className="mx-1.5 text-[var(--line)]">·</span>
                            <span className="text-amber-800 font-medium">{gaps}</span> missing vs competitors
                            <span className="mx-1.5 text-[var(--line)]">·</span>
                            <span className="text-red-600 font-medium">{threats}</span> warning
                            {threats === 1 ? "" : "s"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              <Card>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="font-semibold">All your clients</h2>
                      <p className="text-sm text-[var(--muted)] mt-1">
                        One row per brand. Read left to right to see how they’re doing and what to do next.
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink)]">
                        <span className="font-medium">{activeClients}</span>
                        <span className="text-[var(--muted)]"> clients being tracked</span>
                        <span className="mx-1.5 text-[var(--muted)]">·</span>
                        <span className="font-medium">{totalRivals}</span>
                        <span className="text-[var(--muted)]"> competitors found</span>
                        <span className="mx-1.5 text-[var(--muted)]">·</span>
                        <span className="font-medium text-red-600">{totalThreats}</span>
                        <span className="text-[var(--muted)]"> warnings</span>
                        <span className="mx-1.5 text-[var(--muted)]">·</span>
                        <span className="font-medium text-amber-800">{totalUnique}</span>
                        <span className="text-[var(--muted)]"> missing or to-build items</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Client list filter">
                      <Button
                        type="button"
                        variant={filter === "all" ? "primary" : "ghost"}
                        onClick={() => setFilter("all")}
                        title="Show every client"
                      >
                        All clients
                      </Button>
                      <Button
                        type="button"
                        variant={filter === "attention" ? "primary" : "ghost"}
                        onClick={() => setFilter("attention")}
                        title="Show only clients that need a closer look"
                      >
                        Needs a closer look
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={onSearch} className="relative max-w-md">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <Input
                      ref={searchRef}
                      id="dashboard-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Find a client… (press /)"
                      className="pl-9"
                      aria-label="Search clients"
                    />
                  </form>

                  <details className="rounded-xl border border-[var(--line)] bg-black/[0.02] px-3 py-2.5 sm:px-4">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">
                      What do these columns mean?
                    </summary>
                    <ul className="mt-3 space-y-2.5 border-t border-[var(--line)] pt-3">
                      {COLUMN_HELP.map((item) => (
                        <li key={item.label} className="text-sm">
                          <span className="font-medium text-[var(--ink)]">{item.label}:</span>{" "}
                          <span className="text-[var(--muted)]">{item.meaning}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 border-t border-[var(--line)] pt-3 text-sm text-[var(--muted)]">
                      The colored bars live in the <span className="font-medium text-[var(--ink)]">You vs competitors</span>{" "}
                      card above — teal = what you have, amber = missing, red = warnings.
                    </p>
                  </details>
                </div>

                <div className="space-y-3 md:hidden">
                  {visiblePortfolio.map((c) => {
                    const open = expandedId === c.id;
                    return (
                      <div key={c.id} className={mobileCardClass(c)}>
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/clients/${c.id}`} className="min-w-0">
                            <div className="font-medium truncate hover:text-[var(--accent)]">{c.name}</div>
                            <div className="text-xs text-[var(--muted)] mt-0.5">{c.industry || "—"}</div>
                          </Link>
                          <span className={statusBadge(c.is_active)}>{c.is_active ? "On" : "Off"}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={healthBadge(c.health)}>{c.health}</span>
                          <span className="text-xs text-[var(--muted)]">
                            <span className="font-medium tabular-nums text-[var(--ink)]">{c.rivals}</span> competitors
                          </span>
                          <span className="text-xs text-[var(--muted)]">
                            <span className="font-medium tabular-nums text-[var(--ink)]">{c.uniqueFeatures}</span> missing
                            / to-build
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg border border-[var(--line)] bg-black/[0.02] px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                            What to do next
                          </p>
                          <div className="mt-1">
                            <NextActionCell c={c} />
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)]">{c.note}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExpand(c.id)}
                          aria-expanded={open}
                          className="mt-3 inline-flex w-full items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-black/[0.02]"
                        >
                          <span>{open ? "Hide details" : "Show competitors & missing"}</span>
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {open ? (
                          <div className="mt-2 rounded-lg border border-[var(--line)] bg-white px-3 py-3">
                            <DetailsPanels clientId={c.id} />
                          </div>
                        ) : null}
                        <div className="mt-3 border-t border-[var(--line)] pt-3">
                          <ActionButtons c={c} />
                        </div>
                      </div>
                    );
                  })}
                  {visiblePortfolio.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">
                      {query
                        ? "No clients match your search."
                        : filter === "attention"
                          ? "Nothing needs a closer look right now. Switch to All clients."
                          : "No clients yet."}
                    </p>
                  ) : null}
                </div>

                <div className="hidden md:block">
                  <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--line)] bg-black/[0.03] text-left">
                          <th className="w-10 px-2 py-3" aria-label="Expand" />
                          <th className="px-3 py-3 font-medium">
                            <SortButton
                              label="Client"
                              active={sortKey === "name"}
                              dir={sortDir}
                              onClick={() => toggleSort("name")}
                            />
                          </th>
                          <th
                            className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
                            title={COLUMN_HELP[0].meaning}
                          >
                            Status
                          </th>
                          <th className="px-3 py-3" title={COLUMN_HELP[1].meaning}>
                            <SortButton
                              label="Health"
                              active={sortKey === "health"}
                              dir={sortDir}
                              onClick={() => toggleSort("health")}
                            />
                          </th>
                          <th className="px-3 py-3 text-center" title={COLUMN_HELP[2].meaning}>
                            <div className="flex justify-center">
                              <SortButton
                                label="Competitors"
                                active={sortKey === "rivals"}
                                dir={sortDir}
                                onClick={() => toggleSort("rivals")}
                              />
                            </div>
                          </th>
                          <th className="px-3 py-3" title={COLUMN_HELP[3].meaning}>
                            <SortButton
                              label="Missing & to-build"
                              active={sortKey === "uniqueFeatures"}
                              dir={sortDir}
                              onClick={() => toggleSort("uniqueFeatures")}
                            />
                          </th>
                          <th
                            className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
                            title={COLUMN_HELP[4].meaning}
                          >
                            Next step
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePortfolio.map((c) => {
                          const open = expandedId === c.id;
                          return (
                            <Fragment key={c.id}>
                              <tr className={rowClass(c)}>
                                <td className="px-2 py-3.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(c.id)}
                                    aria-expanded={open}
                                    aria-label={open ? `Hide details for ${c.name}` : `Show details for ${c.name}`}
                                    title={open ? "Hide details" : "Show competitors, missing & to-build"}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-black/[0.03] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                  >
                                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </button>
                                </td>
                                <td className="px-3 py-3.5">
                                  <Link
                                    href={`/clients/${c.id}`}
                                    className="font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                                  >
                                    {c.name}
                                  </Link>
                                  <div className="mt-0.5 text-xs text-[var(--muted)]">{c.industry || "—"}</div>
                                  <div className="mt-1 max-w-[16rem] text-xs text-[var(--muted)] line-clamp-1">
                                    {c.latest}
                                  </div>
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                  <span className={statusBadge(c.is_active)}>{c.is_active ? "On" : "Off"}</span>
                                </td>
                                <td className="px-3 py-3.5">
                                  <span className={healthBadge(c.health)}>{c.health}</span>
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(c.id)}
                                    className="group mx-auto block rounded-lg px-2 py-1 hover:bg-black/[0.03]"
                                    title="Show competitor list"
                                  >
                                    <div className="text-base font-semibold tabular-nums text-[var(--ink)] group-hover:text-[var(--accent)]">
                                      {c.rivals}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">found</div>
                                  </button>
                                </td>
                                <td className="px-3 py-3.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(c.id)}
                                    className="group rounded-lg px-1 py-1 text-left hover:bg-black/[0.03]"
                                    title="Show missing & to-build items"
                                  >
                                    <div className="text-base font-semibold tabular-nums text-[var(--ink)] group-hover:text-[var(--accent)]">
                                      {c.uniqueFeatures}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                                      {(c.gaps ?? 0) > 0 || (c.wishlist ?? 0) > 0
                                        ? `${c.gaps ?? 0} missing · ${c.wishlist ?? 0} to build`
                                        : "Nothing missing yet"}
                                    </div>
                                  </button>
                                </td>
                                <td className="max-w-[14rem] px-3 py-3.5">
                                  <NextActionCell c={c} />
                                  <div className="mt-1 text-xs leading-snug text-[var(--muted)]">{c.note}</div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex flex-wrap justify-end gap-1.5">
                                    <ActionButtons c={c} compact />
                                  </div>
                                </td>
                              </tr>
                              {open ? (
                                <tr className="border-b border-[var(--line)] bg-black/[0.02]">
                                  <td colSpan={8} className="px-4 py-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-sm font-medium text-[var(--ink)]">
                                        Details for {c.name}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedId("")}
                                        className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                                      >
                                        Close
                                      </button>
                                    </div>
                                    <DetailsPanels clientId={c.id} />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {visiblePortfolio.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {query
                        ? "No clients match your search."
                        : filter === "attention"
                          ? "Nothing needs a closer look right now. Switch to All clients."
                          : "No clients yet."}
                    </p>
                  ) : null}
                </div>
              </Card>
            </>
          )}
        </div>
      ) : error ? null : (
        <PortfolioSkeleton />
      )}
      <DashboardHelp />
    </AppShell>
  );
}
