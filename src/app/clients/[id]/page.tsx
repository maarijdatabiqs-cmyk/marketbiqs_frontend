"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FeatureStanceChart } from "@/components/Charts";
import { IntelProgressOverlay, IntelRunPhase, useIntelProgress } from "@/components/IntelProgress";
import { IntelSetupDialog, IntelSetupOptions } from "@/components/IntelSetupDialog";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { api, downloadReportPdf, runClientIntel } from "@/lib/api";

type RadarSectionId = "trends" | "sentiment" | "snapshots" | "jobs";

function RadarCollapsible({
  title,
  subtitle,
  count,
  open,
  onToggle,
  children,
  headerAction,
}: {
  title: string;
  subtitle: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start gap-2 px-5 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          aria-expanded={open}
          title={open ? "Hide this section" : "Show this section"}
        >
          <ChevronDown
            size={18}
            className={`mt-0.5 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          />
          <span className="min-w-0">
            <span className="block font-semibold text-[var(--ink)]">
              {title}
              {typeof count === "number" ? (
                <span className="ml-1.5 font-normal text-[var(--muted)]">({count})</span>
              ) : null}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">{subtitle}</span>
          </span>
        </button>
        {headerAction ? <div className="shrink-0 pt-0.5">{headerAction}</div> : null}
      </div>
      {open ? <div className="space-y-3 border-t border-[var(--line)] px-5 py-4">{children}</div> : null}
    </Card>
  );
}

type Tab = "loop" | "features" | "competitors" | "compare" | "gaps" | "alerts" | "wishlist" | "reports" | "radar";

const VALID_TABS: Tab[] = [
  "loop",
  "features",
  "competitors",
  "compare",
  "gaps",
  "alerts",
  "wishlist",
  "reports",
  "radar",
];

const TAB_HELP: Record<Tab, string> = {
  loop: "Start here each week: see what competitors offer that this brand doesn’t, pick what matters, and plan the next moves in plain English.",
  features: "Everything this brand already offers today. To track something new to build, save it from This week’s plan, Competitors, or Warnings.",
  competitors:
    "Add or pick a rival, then see the scoreboard and a feature-by-feature comparison for that company.",
  compare:
    "Add or pick a rival, then see the scoreboard and a feature-by-feature comparison for that company.",
  gaps:
    "Add or pick a rival, then see the scoreboard and a feature-by-feature comparison for that company.",
  alerts: "Things competitors offer that this brand still doesn’t. Clear these as you act on them.",
  wishlist: "Ideas you saved to build later. Turn any item into a simple step-by-step plan (and send to Jira if connected).",
  reports: "Written summaries after each competitor check. One can run automatically every day, or you can start one anytime.",
  radar:
    "What’s hot in this market right now: trending topics, how people talk about the space, saved web pages, and background refresh jobs.",
};

const DEFAULT_NEXT_ACTIONS = [
  "Read the suggestions below — what rivals offer that this brand still lacks",
  "Save the important ones to the build list so the team can act on them",
  "Open a simple build plan (and send tasks to Jira if you use it)",
  "Write a short weekly summary you can share with the client",
];

function confidenceLabel(score: number | null | undefined) {
  const pct = Math.round((score || 0) * 100);
  if (pct >= 80) return `We're quite sure (${pct}%)`;
  if (pct >= 50) return `Fairly sure (${pct}%)`;
  return `Early signal (${pct}%)`;
}

function isThinFeatureDescription(name: string, description?: string | null) {
  const desc = (description || "").trim();
  if (!desc) return true;
  if (desc.toLowerCase() === name.toLowerCase()) return true;
  if (desc.length < 90) return true;
  if (!desc.includes(".") && desc.length < 140) return true;
  return false;
}

function softFeatureJargon(text: string) {
  return text
    .replace(/production[-\s]?grade\s+AI,?\s+not\s+demoware/gi, "AI that is ready for real day-to-day business use — not just a flashy demo")
    .replace(/architecture[-\s]?first\s+thinking/gi, "planning the system carefully before building anything")
    .replace(/production[-\s]?grade/gi, "ready for real day-to-day business use")
    .replace(/\bdemoware\b/gi, "a demo that looks good but is not ready for real work")
    .replace(/architecture[-\s]?first/gi, "planned carefully before building")
    .replace(/enterprise[-\s]?grade/gi, "built for larger companies")
    .replace(/end[-\s]?to[-\s]?end/gi, "handled from start to finish")
    .replace(/cutting[-\s]?edge/gi, "up-to-date")
    .replace(/state[-\s]?of[-\s]?the[-\s]?art/gi, "modern")
    .replace(/AI[-\s]?powered/gi, "using AI to help")
    .replace(/ML[-\s]?powered/gi, "using machine learning to help");
}

/** Prefer saved text; if it's a short slogan, expand to 2–3 plain sentences for display. */
function featurePlainBlurb(
  feature: { name: string; category?: string | null; description?: string | null },
  clientName: string,
) {
  const name = feature.name || "This offering";
  const category = (feature.category || "").trim();
  const raw = (feature.description || "").trim();
  if (!isThinFeatureDescription(name, raw)) return softFeatureJargon(raw);

  let soft = softFeatureJargon(raw || name);
  if (soft.toLowerCase() === name.toLowerCase() || soft.length < 40) {
    soft = `it covers ${name.toLowerCase()} for their clients`;
  }
  const catBit =
    category && !["general", "capability"].includes(category.toLowerCase()) ? ` (${category})` : "";
  const mid = soft.charAt(0).toLowerCase() + soft.slice(1);
  return (
    `${name} is something ${clientName} already offers${catBit}. ` +
    `In simple terms, ${mid}${mid.endsWith(".") ? "" : "."} ` +
    `This is part of what customers can buy or use from them today — not a future idea.`
  );
}

function tabFromQuery(raw: string | null): Tab {
  if (raw === "compare" || raw === "gaps") return "competitors"; // merged into Competitors
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as Tab;
  return "loop";
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const clientId = params.id;
  const [tab, setTab] = useState<Tab>(() => tabFromQuery(searchParams.get("tab")));
  const [client, setClient] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState("");
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState("");
  const [competitorDetail, setCompetitorDetail] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelPhase, setIntelPhase] = useState<IntelRunPhase>("running");
  const [intelSuccess, setIntelSuccess] = useState("");
  const [intelError, setIntelError] = useState("");
  const intelProgress = useIntelProgress(intelOpen && intelPhase === "running");
  const [featureForm, setFeatureForm] = useState({ name: "", category: "General", description: "" });
  const [compForm, setCompForm] = useState({ name: "", website: "" });
  const [radarOpen, setRadarOpen] = useState<Record<RadarSectionId, boolean>>({
    trends: true,
    sentiment: true,
    snapshots: false,
    jobs: false,
  });
  const clarifyTried = useRef(false);

  function toggleRadar(id: RadarSectionId) {
    setRadarOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    clarifyTried.current = false;
  }, [clientId]);

  async function loadAll() {
    const soft = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    const [c, comps, feats, a, r, loop, wish, tr, sent, snaps, j] = await Promise.all([
      api<any>(`/api/clients/${clientId}`),
      soft(api<any[]>(`/api/clients/${clientId}/competitors`), []),
      soft(api<any[]>(`/api/clients/${clientId}/features`), []),
      soft(api<any[]>(`/api/clients/${clientId}/alerts`), []),
      soft(api<any[]>(`/api/clients/${clientId}/reports`), []),
      soft(api<any>(`/api/clients/${clientId}/weekly-loop`), null),
      soft(api<any[]>(`/api/clients/${clientId}/wishlist`), []),
      soft(api<any[]>(`/api/clients/${clientId}/trends`), []),
      soft(api<any[]>(`/api/clients/${clientId}/sentiment`), []),
      soft(api<any[]>(`/api/clients/${clientId}/snapshots`), []),
      soft(api<any[]>(`/api/clients/${clientId}/jobs`), []),
    ]);
    setClient(c);
    setCompetitors(comps);
    setFeatures(feats);
    setAlerts(a);
    setReports(r);
    setWeekly(loop);
    setWishlist(wish);
    setTrends(Array.isArray(tr) ? tr : []);
    setSentiment(Array.isArray(sent) ? sent : []);
    setSnapshots(Array.isArray(snaps) ? snaps : []);
    setJobs(Array.isArray(j) ? j : []);
    setError("");
    if (!selectedCompetitorId && comps[0]) setSelectedCompetitorId(comps[0].id);
    if (!selectedFeatureId && wish[0]) setSelectedFeatureId(wish[0].id);
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => {
    if (!selectedCompetitorId) {
      setComparisons([]);
      setCompetitorDetail(null);
      return;
    }
    api<any[]>(`/api/clients/${clientId}/comparisons?competitor_id=${selectedCompetitorId}`)
      .then(setComparisons)
      .catch(() => setComparisons([]));
    if (tab === "competitors" || tab === "compare") {
      api<any>(`/api/clients/${clientId}/competitors/${selectedCompetitorId}`)
        .then(setCompetitorDetail)
        .catch(() => setCompetitorDetail(null));
    }
  }, [clientId, selectedCompetitorId, tab]);

  useEffect(() => {
    if (!selectedFeatureId || tab !== "wishlist") {
      if (tab !== "wishlist") return;
      setTickets([]);
      return;
    }
    api<any[]>(`/api/clients/${clientId}/features/${selectedFeatureId}/tickets`)
      .then(setTickets)
      .catch(() => setTickets([]));
  }, [clientId, selectedFeatureId, tab]);

  const selectedCompetitor = useMemo(
    () => competitors.find((c) => c.id === selectedCompetitorId) || null,
    [competitors, selectedCompetitorId],
  );

  const ownedFeatures = useMemo(
    () => features.filter((f) => !f.is_wishlisted && !f.is_loved),
    [features],
  );

  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.acted_on && !a.acted_at && !a.is_acted && a.status !== "acted"),
    [alerts],
  );

  useEffect(() => {
    if (tab !== "features" || clarifyTried.current || busy || !clientId) return;
    if (!ownedFeatures.length) return;
    if (!ownedFeatures.some((f) => isThinFeatureDescription(f.name, f.description))) return;
    clarifyTried.current = true;
    clarifyFeatureDescriptions().catch(() => {
      clarifyTried.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, clientId, ownedFeatures.length]);

  const compareStance = useMemo(() => {
    let youLead = 0;
    let parity = 0;
    let theyLead = 0;
    for (const row of comparisons) {
      const ours = String(row.our_status || "").toLowerCase();
      const theirs = String(row.competitor_status || "").toLowerCase();
      if (ours === "leading" || theirs === "lagging") youLead += 1;
      else if (theirs === "leading" || ours === "lagging") theyLead += 1;
      else parity += 1;
    }
    return { youLead, parity, theyLead };
  }, [comparisons]);

  async function startIntelRun(options: IntelSetupOptions) {
    setSetupOpen(false);
    setBusy("pack");
    setError("");
    setMessage("");
    setIntelSuccess("");
    setIntelError("");
    setIntelPhase("running");
    setIntelOpen(true);
    try {
      const job = await runClientIntel(clientId, options);
      const pack = job.result_meta?.pack;
      const enrich = job.result_meta?.enrich;
      const summary = `Competitor check done · ${enrich?.features || 0} features found · ${pack?.competitors || 0} rivals · report ready.`;
      setMessage(summary);
      setIntelSuccess(summary);
      setIntelPhase("success");
      await loadAll();
      setTab("reports");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Intel run failed";
      setError(detail);
      setIntelError(detail);
      setIntelPhase("error");
    } finally {
      setBusy("");
    }
  }

  function runIntel() {
    setSetupOpen(true);
  }

  async function generateWeeklyBrief() {
    setBusy("brief");
    setError("");
    setMessage("");
    try {
      const brief = await api<any>(`/api/clients/${clientId}/weekly-brief`, { method: "POST" });
      await loadAll();
      setMessage(brief?.title ? `Weekly summary ready · ${brief.title}` : "Weekly summary ready");
      setTab("reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write the weekly summary");
    } finally {
      setBusy("");
    }
  }

  async function togglePin(competitorId: string, isPinned: boolean) {
    setBusy(`pin-${competitorId}`);
    setError("");
    try {
      await api(`/api/clients/${clientId}/competitors/${competitorId}/${isPinned ? "unpin" : "pin"}`, {
        method: "POST",
      });
      setMessage(isPinned ? "Competitor unpinned" : "Competitor pinned");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pin update failed");
    } finally {
      setBusy("");
    }
  }

  async function sendFeedback(entity_type: "comparison" | "gap" | "alert", entity_id: string, rating: "useful" | "useless") {
    setBusy(`fb-${entity_id}-${rating}`);
    setError("");
    try {
      await api(`/api/clients/${clientId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ entity_type, entity_id, rating }),
      });
      setMessage(rating === "useful" ? "Marked useful" : "Marked useless");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed");
    } finally {
      setBusy("");
    }
  }

  async function markAlertDone(alertId: string) {
    setBusy(`alert-${alertId}`);
    setError("");
    try {
      await api(`/api/clients/${clientId}/alerts/${alertId}/acted`, { method: "POST" });
      setMessage("Alert marked done");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mark done failed");
    } finally {
      setBusy("");
    }
  }

  async function addWishlist(payload: { feature_name: string; category?: string; description?: string }) {
    setBusy("wish");
    try {
      const f = await api<any>(`/api/clients/${clientId}/wishlist`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(`Saved “${f.name}” to the build list`);
      setSelectedFeatureId(f.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save to build list");
    } finally {
      setBusy("");
    }
  }

  async function openPlan(featureId: string) {
    setBusy("plan");
    setError("");
    try {
      const generated = await api<any[]>(`/api/clients/${clientId}/features/${featureId}/development-plan`, {
        method: "POST",
      });
      setSelectedFeatureId(featureId);
      setTickets(generated);
      setTab("wishlist");
      setMessage(`${generated.length} build steps ready`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the plan");
    } finally {
      setBusy("");
    }
  }

  async function pushJira() {
    if (!selectedFeatureId) return;
    setBusy("jira");
    setError("");
    setMessage("");
    try {
      const created = await api<any[]>(
        `/api/clients/${clientId}/features/${selectedFeatureId}/tickets/create-all`,
        { method: "POST" },
      );
      setTickets(created);
      const pushed = created.filter((t) => t.jira_key).length;
      if (pushed === 0) {
        setError("No tickets were pushed. Connect Jira under Integrations, then try again.");
      } else {
        setMessage(`Sent ${pushed} of ${created.length} tasks to Jira`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send to Jira");
    } finally {
      setBusy("");
    }
  }

  async function pushBiqs() {
    if (!selectedFeatureId) return;
    setBusy("biqs");
    setError("");
    setMessage("");
    try {
      const created = await api<any[]>(
        `/api/clients/${clientId}/features/${selectedFeatureId}/tickets/push-biqs`,
        { method: "POST" },
      );
      setMessage(
        created.length
          ? `Added ${created.length} tickets to the Biqs board — open Biqs to drag them across the workflow.`
          : "These tickets are already on the Biqs board.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add tickets to Biqs");
    } finally {
      setBusy("");
    }
  }

  async function addFeature(e: FormEvent) {
    e.preventDefault();
    setBusy("feature");
    setError("");
    try {
      await api(`/api/clients/${clientId}/features`, { method: "POST", body: JSON.stringify(featureForm) });
      setFeatureForm({ name: "", category: "General", description: "" });
      setMessage("Feature added");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add feature");
    } finally {
      setBusy("");
    }
  }

  async function clarifyFeatureDescriptions() {
    setBusy("clarify");
    setError("");
    setMessage("");
    try {
      const updated = await api<any[]>(`/api/clients/${clientId}/features/clarify`, { method: "POST" });
      setFeatures(updated);
      setMessage("Feature descriptions rewritten in simple English");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rewrite descriptions");
    } finally {
      setBusy("");
    }
  }

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    setBusy("competitor");
    setError("");
    try {
      const created = await api<any>(`/api/clients/${clientId}/competitors`, {
        method: "POST",
        body: JSON.stringify(compForm),
      });
      setCompForm({ name: "", website: "" });
      setMessage(`Added competitor “${created.name || compForm.name}”`);
      await loadAll();
      setSelectedCompetitorId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add competitor");
    } finally {
      setBusy("");
    }
  }

  if (!client) {
    return (
      <AppShell>
        {error ? (
          <div className="space-y-3">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => loadAll().catch((err) => setError(err.message))}>Retry</Button>
          </div>
        ) : (
          <Card className="max-w-lg">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-soft)] opacity-70" />
                <span className="relative h-3 w-3 rounded-full bg-[var(--accent)]" />
              </span>
              <div>
                <div className="font-medium text-[var(--ink)]">Loading this client…</div>
                <div className="text-sm text-[var(--muted)]">Pulling competitors, features, warnings, and reports…</div>
              </div>
            </div>
          </Card>
        )}
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "loop", label: "This week’s plan" },
    { id: "features", label: "What they offer", count: ownedFeatures.length },
    { id: "competitors", label: "Competitors", count: competitors.length },
    { id: "alerts", label: "Warnings", count: activeAlerts.length },
    { id: "wishlist", label: "Build list", count: wishlist.length },
    { id: "reports", label: "Reports", count: reports.length },
    { id: "radar", label: "What’s trending" },
  ];

  const loopRecs = weekly?.recommendations || [];
  const missingCount = loopRecs.filter((r: any) => r.type === "missing").length;
  const improveCount = loopRecs.filter((r: any) => r.type !== "missing").length;
  const nextActions =
    Array.isArray(weekly?.next_actions) && weekly.next_actions.length
      ? weekly.next_actions
      : DEFAULT_NEXT_ACTIONS;

  return (
    <AppShell>
      <IntelSetupDialog
        open={setupOpen}
        clientName={client?.name}
        busy={busy === "pack"}
        onCancel={() => setSetupOpen(false)}
        onConfirm={startIntelRun}
      />
      <IntelProgressOverlay
        open={intelOpen}
        phase={intelPhase}
        clientName={client.name}
        stepIndex={intelProgress.stepIndex}
        progress={intelProgress.progress}
        elapsedMs={intelProgress.elapsedMs}
        tipIndex={intelProgress.tipIndex}
        successMessage={intelSuccess}
        errorMessage={intelError}
        onDismiss={() => setIntelOpen(false)}
      />
      <PageHeader
        title={client.name}
        subtitle={`${client.industry || "Industry not set yet"} · ${competitors.length} competitors watched · checks can run daily, or whenever you click the button`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients">
              <Button variant="ghost">All clients</Button>
            </Link>
            <Link href={`/portal/${clientId}`}>
              <Button variant="ghost">Client chat portal</Button>
            </Link>
            <Button onClick={runIntel} disabled={!!busy}>
              {busy === "pack" ? "Working…" : "Check competitors"}
            </Button>
          </div>
        }
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0 tabs-scroll">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            title={TAB_HELP[t.id]}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm border touch-manipulation ${
              tab === t.id
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "border-[var(--line)] text-[var(--muted)] hover:bg-black/5"
            }`}
          >
            {t.label}
            {typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--muted)] mb-6 max-w-3xl leading-relaxed">{TAB_HELP[tab]}</p>

      <div className="space-y-4 max-w-4xl">
        {tab === "loop" ? (
          <>
            <Card>
              <h2 className="font-semibold text-lg">What this page is for</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Think of this as a weekly check-in for {client.name}. We look at what competitors offer, highlight
                what this brand is missing or can improve, and help you decide what to build or talk about next —
                without needing deep tech jargon.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Step 1</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ink)]">Read the suggestions</div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Each card is one idea: something a rival has, or something this brand already has but could make better.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Step 2</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ink)]">Save what matters</div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Hit “Save to build list” on the ideas worth acting on. They’ll wait for you under Build list.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Step 3</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ink)]">Share a short update</div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Write a weekly summary for the client, or open Build list to turn an idea into simple next steps.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold mb-3">At a glance</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-[var(--line)] px-3 py-3">
                  <div className="text-2xl font-semibold text-[var(--ink)]">{competitors.length}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">Competitors watched</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] px-3 py-3">
                  <div className="text-2xl font-semibold text-[var(--ink)]">{loopRecs.length}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">
                    Ideas this week
                    {loopRecs.length ? (
                      <span className="block mt-0.5">
                        {missingCount} missing · {improveCount} to improve
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] px-3 py-3">
                  <div className="text-2xl font-semibold text-[var(--ink)]">{wishlist.length}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">Saved on build list</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] px-3 py-3">
                  <div className="text-2xl font-semibold text-[var(--ink)]">{activeAlerts.length}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">Open warnings</div>
                </div>
              </div>
              {weekly?.latest_report ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Latest report:{" "}
                  <button
                    type="button"
                    className="font-medium text-[var(--accent)] hover:underline"
                    onClick={() => setTab("reports")}
                  >
                    {weekly.latest_report.title || "Open reports"}
                  </button>
                  {weekly.latest_report.created_at
                    ? ` · ${new Date(weekly.latest_report.created_at).toLocaleDateString()}`
                    : ""}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No report yet. Click <strong className="font-medium text-[var(--ink)]">Check competitors</strong> above
                  to create the first one.
                </p>
              )}
            </Card>

            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h2 className="font-semibold">Suggested order of work</h2>
                  <p className="mt-1 text-sm text-[var(--muted)] max-w-xl">
                    A simple checklist so anyone on the team knows what to do this week — even if they’re not technical.
                  </p>
                </div>
                <Button onClick={generateWeeklyBrief} disabled={!!busy}>
                  {busy === "brief" ? "Writing…" : "Write weekly summary"}
                </Button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm text-[var(--ink)] list-decimal pl-5">
                {nextActions.map((a: string) => (
                  <li key={a} className="leading-relaxed text-[var(--muted)] pl-1">
                    <span className="text-[var(--ink)]">{a}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
                “Write weekly summary” creates a short client-ready note from the latest findings and saves it under Reports.
              </p>
            </Card>

            <div className="pt-1">
              <h2 className="font-semibold">Ideas to review</h2>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
                Each card is one opportunity. Pink labels mean a competitor has it and this brand doesn’t. Amber labels
                mean this brand already has something similar but a rival does it better.
              </p>
            </div>

            {loopRecs.map((rec: any) => {
              const isMissing = rec.type === "missing";
              return (
                <Card key={`${rec.type}-${rec.feature_name}-${rec.competitor_id}`}>
                  <div
                    className={`text-xs font-medium uppercase tracking-wide ${
                      isMissing ? "text-rose-600" : "text-amber-700"
                    }`}
                  >
                    {isMissing ? "They have it · you don’t yet" : "You have it · make it stronger"}
                  </div>
                  <div className="font-semibold mt-1.5 text-lg">{rec.feature_name}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                    <span>
                      Compared with <strong className="font-medium text-[var(--ink)]">{rec.competitor_name}</strong>
                    </span>
                    <span aria-hidden>·</span>
                    <span>{confidenceLabel(rec.confidence_score)}</span>
                    {rec.category ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>{rec.category}</span>
                      </>
                    ) : null}
                  </div>

                  {rec.recommendation ? (
                    <div className="mt-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">What this means</div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink)]">{rec.recommendation}</p>
                    </div>
                  ) : null}

                  {rec.why ? (
                    <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 px-3 py-2.5">
                      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        Why the competitor is ahead
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{rec.why}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      disabled={!!busy}
                      onClick={() =>
                        addWishlist({
                          feature_name: rec.feature_name,
                          category: rec.category || "General",
                          description: rec.recommendation,
                        })
                      }
                    >
                      {busy === "wish" ? "Saving…" : "Save to build list"}
                    </Button>
                    <Button variant="ghost" onClick={() => setTab("wishlist")}>
                      Open build list
                    </Button>
                    {rec.competitor_id ? (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSelectedCompetitorId(rec.competitor_id);
                          setTab("competitors");
                        }}
                      >
                        Compare with {rec.competitor_name}
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Saving adds this idea to Build list so your team can turn it into concrete next steps later.
                  </p>
                </Card>
              );
            })}

            {loopRecs.length === 0 ? (
              <Card>
                <h2 className="font-semibold">No ideas yet</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] mb-4">
                  Run a competitor check first. We’ll find what rivals offer, what’s missing for {client.name}, and
                  suggest clear next moves you can save to the build list.
                </p>
                <Button onClick={runIntel} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Check competitors"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "features" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">What {client.name} already offers</h2>
              <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
                Each item below is something this brand already sells or delivers today. Descriptions are written in
                plain English so anyone on the team can understand them — not just engineers.
              </p>
              {ownedFeatures.some((f) => isThinFeatureDescription(f.name, f.description)) ? (
                <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    Some descriptions look short or technical. Rewrite them into clear 2–3 sentence explanations.
                  </p>
                  <Button onClick={clarifyFeatureDescriptions} disabled={!!busy} className="shrink-0">
                    {busy === "clarify" ? "Rewriting…" : "Rewrite in simple English"}
                  </Button>
                </div>
              ) : null}
              <h3 className="font-medium mb-3 text-sm">Add something manually</h3>
              <form onSubmit={addFeature} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={featureForm.name} onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={featureForm.category} onChange={(e) => setFeatureForm({ ...featureForm, category: e.target.value })} />
                </div>
                <div>
                  <Label>Description (2–3 plain sentences)</Label>
                  <Textarea
                    rows={3}
                    value={featureForm.description}
                    onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                    placeholder="What does the customer get? Why does it matter? Keep it simple."
                  />
                </div>
                <Button type="submit">Save</Button>
              </form>
            </Card>
            {ownedFeatures.map((f) => {
              const blurb = featurePlainBlurb(f, client.name);
              const wasThin = isThinFeatureDescription(f.name, f.description);
              return (
                <Card key={f.id}>
                  <div className="font-semibold text-base">{f.name}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {f.category || "General"}
                    {wasThin ? " · clarifying short text for easier reading" : ""}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">What this means</div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink)] whitespace-pre-wrap">{blurb}</p>
                  </div>
                </Card>
              );
            })}
            {!ownedFeatures.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                  Nothing listed yet. Check competitors to pull features automatically, or add one above.
                </p>
                <Button onClick={runIntel} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Check competitors"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "competitors" || tab === "compare" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">Add a competitor manually</h2>
              <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                If someone important is missing from the automatic list, add them here.
              </p>
              <form onSubmit={addCompetitor} className="space-y-3">
                <div>
                  <Label>Company name</Label>
                  <Input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={compForm.website} onChange={(e) => setCompForm({ ...compForm, website: e.target.value })} />
                </div>
                <Button type="submit">Add competitor</Button>
              </form>
            </Card>

            {competitors.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                  No competitors yet. Check competitors to find who else is in this space, or add one manually above.
                </p>
                <Button onClick={runIntel} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Check competitors"}
                </Button>
              </Card>
            ) : (
              <Card>
                <Label>Compare {client.name} with</Label>
                <p className="mt-1 mb-2 text-sm text-[var(--muted)] leading-relaxed">
                  Pick a rival to see the scoreboard and a feature-by-feature comparison.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {competitors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompetitorId(c.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedCompetitorId === c.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)] font-medium"
                          : "border-[var(--line)] text-[var(--muted)] hover:bg-black/5"
                      }`}
                    >
                      <span className="block">{c.name}</span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-wide opacity-80">
                        {Math.round(c.overlap_score || 0)}% overlap
                        {c.is_pinned ? " · pinned" : ""}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedCompetitor ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
                    <span>
                      Selected: <strong className="text-[var(--ink)]">{selectedCompetitor.name}</strong>
                    </span>
                    {selectedCompetitor.website ? (
                      <a
                        className="text-[var(--accent)]"
                        href={selectedCompetitor.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Website
                      </a>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="!px-2 !py-1 text-xs"
                      disabled={!!busy}
                      onClick={() => togglePin(selectedCompetitor.id, !!selectedCompetitor.is_pinned)}
                    >
                      {busy === `pin-${selectedCompetitor.id}`
                        ? "Updating…"
                        : selectedCompetitor.is_pinned
                          ? "Unpin"
                          : "Pin"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            )}

            {selectedCompetitor ? (
              <>
                <Card>
                  <div className="mb-3">
                    <h2 className="font-semibold text-lg">
                      {client.name} vs {selectedCompetitor.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">
                      Where this brand is ahead, even, or behind — and what you can do about it.
                    </p>
                  </div>
                  <FeatureStanceChart
                    title="Quick scoreboard"
                    hint="How many areas this brand is ahead, even, or behind versus the selected competitor."
                    youLead={compareStance.youLead}
                    parity={compareStance.parity}
                    theyLead={compareStance.theyLead}
                    rivalName={selectedCompetitor.name}
                  />
                </Card>

                {comparisons.map((row) => (
                  <Card key={row.id}>
                    <div className="font-semibold">{row.feature_name}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {client.name}: {row.our_status || "—"} · {selectedCompetitor.name}:{" "}
                      {row.competitor_status || "—"} · {confidenceLabel(row.confidence_score)}
                    </div>
                    {row.note ? <p className="text-sm mt-3 leading-relaxed">{row.note}</p> : null}
                    {row.how_competitor_leads ? (
                      <div className="mt-3 rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
                        <div className="text-xs uppercase text-[var(--muted)] mb-1">Why they look stronger</div>
                        <p className="leading-relaxed">{row.how_competitor_leads}</p>
                      </div>
                    ) : null}
                    {row.how_to_improve ? (
                      <div className="mt-3 rounded-xl border border-[var(--line)] p-3 text-sm">
                        <div className="text-xs uppercase text-[var(--muted)] mb-1">What you can do</div>
                        <p className="leading-relaxed">{row.how_to_improve}</p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        onClick={() =>
                          addWishlist({
                            feature_name: row.feature_name,
                            category: row.category || "General",
                            description: row.how_to_improve || row.note,
                          })
                        }
                      >
                        Save to build list
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => sendFeedback("comparison", row.id, "useful")}
                      >
                        Helpful
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!!busy}
                        onClick={() => sendFeedback("comparison", row.id, "useless")}
                      >
                        Not useful
                      </Button>
                    </div>
                  </Card>
                ))}

                {!comparisons.length ? (
                  <Card>
                    <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                      No side-by-side rows for {selectedCompetitor.name} yet. Run a competitor check to generate the
                      feature-by-feature comparison.
                    </p>
                    <Button onClick={runIntel} disabled={!!busy}>
                      {busy === "pack" ? "Working…" : "Check competitors"}
                    </Button>
                  </Card>
                ) : null}

                <Card>
                  <h2 className="font-semibold text-lg">
                    {(competitorDetail || selectedCompetitor).name}
                    {(competitorDetail || selectedCompetitor).is_pinned ? (
                      <span className="ml-2 text-xs uppercase text-[var(--accent)]">pinned</span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                    {competitorDetail?.description ||
                      competitorDetail?.why_dangerous ||
                      selectedCompetitor.why_dangerous ||
                      "No short description yet"}
                  </p>
                  {(competitorDetail?.website || selectedCompetitor.website) ? (
                    <a
                      className="text-sm text-[var(--accent)] mt-3 inline-block"
                      href={competitorDetail?.website || selectedCompetitor.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {competitorDetail?.website || selectedCompetitor.website}
                    </a>
                  ) : null}

                  <h3 className="font-semibold mt-5 mb-1">What they offer</h3>
                  <p className="text-xs text-[var(--muted)] mb-3">Capabilities this rival promotes publicly</p>
                  <div className="space-y-3">
                    {(competitorDetail?.features || []).map((f: any, idx: number) => (
                      <div
                        key={`${f.name}-${idx}`}
                        className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
                      >
                        <div className="font-medium">{f.name}</div>
                        <div className="text-xs text-[var(--muted)]">{f.category || f.status || "Feature"}</div>
                        <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">{f.description || "—"}</p>
                        <Button
                          className="mt-2"
                          variant="ghost"
                          onClick={() =>
                            addWishlist({
                              feature_name: f.name,
                              category: f.category || "General",
                              description: f.description || "",
                            })
                          }
                        >
                          Save to build list
                        </Button>
                      </div>
                    ))}
                    {!(competitorDetail?.features || []).length ? (
                      <div className="space-y-3">
                        <p className="text-sm text-[var(--muted)]">No features listed for this rival yet.</p>
                        <Button onClick={runIntel} disabled={!!busy}>
                          {busy === "pack" ? "Working…" : "Check competitors"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </>
            ) : null}
          </>
        ) : null}

        {tab === "alerts" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">Open warnings</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                These are things a competitor offers that {client.name} still doesn’t. Save important ones to the build
                list, or mark done once you’ve handled them.
              </p>
            </Card>
            {activeAlerts.map((alert) => (
              <Card key={alert.id}>
                <div className="font-semibold">{alert.title}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  Spotted via {alert.competitor_trigger || "a competitor"}
                  {alert.impact ? ` · impact: ${alert.impact}` : ""}
                </div>
                {alert.why_it_matters ? (
                  <div className="mt-3">
                    <div className="text-xs uppercase text-[var(--muted)] mb-1">Why it matters</div>
                    <p className="text-sm leading-relaxed">{alert.why_it_matters}</p>
                  </div>
                ) : null}
                {alert.action ? (
                  <div className="mt-3">
                    <div className="text-xs uppercase text-[var(--muted)] mb-1">Suggested next step</div>
                    <p className="text-sm leading-relaxed text-[var(--muted)]">{alert.action}</p>
                  </div>
                ) : null}
                {alert.content_draft ? (
                  <div className="mt-3 rounded-xl border border-[var(--line)] p-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {alert.content_draft}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    onClick={() =>
                      addWishlist({
                        feature_name: alert.title.slice(0, 80),
                        description: alert.action,
                      })
                    }
                  >
                    Save to build list
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => markAlertDone(alert.id)}>
                    {busy === `alert-${alert.id}` ? "Updating..." : "Mark done"}
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("alert", alert.id, "useful")}>
                    Helpful
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("alert", alert.id, "useless")}>
                    Not useful
                  </Button>
                </div>
              </Card>
            ))}
            {!activeAlerts.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                  No open warnings right now. That usually means you’re caught up — or you haven’t run a competitor check
                  yet.
                </p>
                <Button onClick={runIntel} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Check competitors"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "wishlist" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">Build list</h2>
              <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
                Ideas you saved to work on later. Pick one, create a simple step-by-step plan, add it to the Biqs
                board, and optionally send those steps to Jira if it’s connected.
              </p>
              <Label>Pick an item</Label>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={selectedFeatureId}
                onChange={(e) => setSelectedFeatureId(e.target.value)}
              >
                {wishlist.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={() => selectedFeatureId && openPlan(selectedFeatureId)} disabled={!selectedFeatureId || !!busy}>
                  {busy === "plan" ? "Building plan…" : "Show step-by-step plan"}
                </Button>
                <Button onClick={pushBiqs} disabled={!tickets.length || !!busy}>
                  {busy === "biqs" ? "Adding…" : "Add tickets to Biqs"}
                </Button>
                <Button variant="ghost" onClick={pushJira} disabled={!tickets.length || !!busy}>
                  {busy === "jira" ? "Sending…" : "Send steps to Jira"}
                </Button>
                <Link href={`/biqs?client=${clientId}`}>
                  <Button variant="ghost" disabled={!!busy}>
                    Open Biqs board
                  </Button>
                </Link>
              </div>
            </Card>
            {wishlist.map((f) => (
              <Card key={f.id}>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-[var(--muted)]">{f.category}</div>
                <p className="text-sm text-[var(--muted)] mt-1">{f.description || "Saved for later"}</p>
                <Button className="mt-3" variant="ghost" onClick={() => openPlan(f.id)}>
                  Show plan
                </Button>
              </Card>
            ))}
            {tickets.map((t) => (
              <Card key={t.id}>
                <div className="text-xs uppercase text-[var(--muted)]">
                  {t.ticket_type} · {t.priority} · {t.estimated_effort || "effort TBD"} · pts {t.story_points ?? "—"}
                </div>
                <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <h3 className="font-semibold break-words min-w-0">{t.heading}</h3>
                  {t.jira_key ? (
                    <a
                      className="text-sm text-[var(--accent)] shrink-0"
                      href={t.jira_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.jira_key}
                    </a>
                  ) : null}
                </div>
                <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{t.body}</p>
                <ul className="mt-3 list-disc pl-5 text-sm text-[var(--muted)] space-y-1">
                  {(t.acceptance_criteria || []).map((c: string) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Card>
            ))}
            {!wishlist.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  Build list is empty. Save ideas from This week’s plan, Competitors, or Warnings.
                </p>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "reports" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">Client-ready reports</h2>
              <p className="text-sm text-[var(--muted)] mb-3 leading-relaxed">
                After each competitor check we save a written summary you can share. One can also run automatically about
                once a day — or start a fresh one anytime.
              </p>
              <Button onClick={runIntel} disabled={!!busy}>
                {busy === "pack" ? "Working…" : "Check competitors & make a report"}
              </Button>
            </Card>
            {reports.map((r) => (
              <Card key={r.id}>
                <div className="font-semibold">{r.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink)]">{r.summary}</p>
                {Array.isArray(r.sections) && r.sections.length ? (
                  <div className="mt-4 space-y-3">
                    {r.sections.slice(0, 4).map((section: any, idx: number) => (
                      <div key={`${r.id}-sec-${idx}`} className="rounded-xl border border-[var(--line)] bg-white/50 px-3 py-2.5">
                        <div className="text-sm font-medium text-[var(--ink)]">{section.heading}</div>
                        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-[var(--muted)]">
                          {(section.bullets || []).slice(0, 4).map((b: string, bi: number) => (
                            <li key={`${r.id}-${idx}-${bi}`}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-2 text-xs text-[var(--muted)]">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                </div>
                <Button
                  className="mt-3"
                  variant="ghost"
                  onClick={() => downloadReportPdf(r.id, `${r.title}.pdf`).catch((e) => setError(e.message))}
                >
                  Download PDF
                </Button>
              </Card>
            ))}
            {!reports.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">No reports yet.</p>
                <Button onClick={runIntel} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Check competitors"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "radar" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">What’s trending around this brand</h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Not a rival feature list — this is the wider market buzz. Open a section below when you need it;
                longer lists (snapshots, background checks) stay closed so the page stays short.
              </p>
            </Card>

            <RadarCollapsible
              title="Rising topics"
              subtitle="Themes getting more attention lately"
              count={trends.length}
              open={radarOpen.trends}
              onToggle={() => toggleRadar("trends")}
              headerAction={
                !trends.length ? (
                  <Button onClick={runIntel} disabled={!!busy}>
                    {busy === "pack" ? "Working…" : "Check competitors"}
                  </Button>
                ) : null
              }
            >
              {trends.map((t: any, idx: number) => (
                <div key={t.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                  <div className="font-medium">{t.topic || t.title || t.name || "Topic"}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {t.platform ? `${t.platform}` : null}
                    {t.velocity_score != null ? ` · momentum ${t.velocity_score}` : null}
                    {t.detected_at ? ` · ${new Date(t.detected_at).toLocaleString()}` : null}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                    {t.summary || t.description || t.detail || "—"}
                  </p>
                </div>
              ))}
              {!trends.length ? (
                <p className="text-sm text-[var(--muted)]">No rising topics yet — run a competitor check to fill this in.</p>
              ) : null}
            </RadarCollapsible>

            <RadarCollapsible
              title="How people talk about it"
              subtitle="Positive, mixed, or negative signals from the market"
              count={sentiment.length}
              open={radarOpen.sentiment}
              onToggle={() => toggleRadar("sentiment")}
            >
              {sentiment.map((s: any, idx: number) => (
                <div key={s.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                  <div className="font-medium">{s.subject || s.label || s.source || s.topic || "Signal"}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {s.score != null ? `score ${s.score}` : null}
                    {s.label ? ` · ${s.label}` : null}
                    {s.polarity ? ` · ${s.polarity}` : null}
                    {s.source ? ` · ${s.source}` : null}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                    {(s.sample_quotes || []).length
                      ? (s.sample_quotes || []).slice(0, 2).join(" · ")
                      : s.summary || s.note || s.description || "—"}
                  </p>
                </div>
              ))}
              {!sentiment.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted)]">No market chatter captured yet.</p>
                  <Button onClick={runIntel} disabled={!!busy}>
                    {busy === "pack" ? "Working…" : "Check competitors"}
                  </Button>
                </div>
              ) : null}
            </RadarCollapsible>

            <RadarCollapsible
              title="Recent snapshots"
              subtitle="Saved pages and captures from competitor sites"
              count={snapshots.length}
              open={radarOpen.snapshots}
              onToggle={() => toggleRadar("snapshots")}
            >
              {snapshots.map((snap: any, idx: number) => (
                <div key={snap.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                  <div className="font-medium">{snap.source || snap.title || snap.label || "Snapshot"}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {snap.scraped_at
                      ? new Date(snap.scraped_at).toLocaleString()
                      : snap.created_at
                        ? new Date(snap.created_at).toLocaleString()
                        : snap.captured_at
                          ? new Date(snap.captured_at).toLocaleString()
                          : ""}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                    {snap.summary || snap.note || snap.description || "Captured competitor snapshot"}
                  </p>
                </div>
              ))}
              {!snapshots.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted)]">No snapshots yet.</p>
                  <Button onClick={runIntel} disabled={!!busy}>
                    {busy === "pack" ? "Working…" : "Check competitors"}
                  </Button>
                </div>
              ) : null}
            </RadarCollapsible>

            <RadarCollapsible
              title="Background checks"
              subtitle="Automated jobs that keep this client’s data fresh"
              count={jobs.length}
              open={radarOpen.jobs}
              onToggle={() => toggleRadar("jobs")}
            >
              {jobs.map((job: any, idx: number) => (
                <div key={job.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                  <div className="font-medium">{job.job_type || job.name || job.title || job.type || "Check"}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {job.status || "status unknown"}
                    {job.finished_at
                      ? ` · ${new Date(job.finished_at).toLocaleString()}`
                      : job.created_at
                        ? ` · ${new Date(job.created_at).toLocaleString()}`
                        : job.updated_at
                          ? ` · ${new Date(job.updated_at).toLocaleString()}`
                          : ""}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                    {job.detail || job.summary || job.message || job.description || "—"}
                  </p>
                </div>
              ))}
              {!jobs.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--muted)]">No background checks logged yet.</p>
                  <Button onClick={runIntel} disabled={!!busy}>
                    {busy === "pack" ? "Working…" : "Check competitors"}
                  </Button>
                </div>
              ) : null}
            </RadarCollapsible>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
