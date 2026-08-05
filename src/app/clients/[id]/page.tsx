"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FeatureStanceChart, GapsByRivalChart } from "@/components/Charts";
import { IntelProgressOverlay, IntelRunPhase, useIntelProgress } from "@/components/IntelProgress";
import { IntelSetupDialog, IntelSetupOptions } from "@/components/IntelSetupDialog";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { api, downloadReportPdf, runClientIntel } from "@/lib/api";

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
  loop: "AI recommends missing competitor features and improvements to your current ones.",
  features: "What this client already ships — inventory only. Use Weekly loop, Comparison, or Alerts to wishlist gaps to build.",
  competitors: "Top rivals discovered by AI — open one for features, description, and website.",
  compare: "Pick a competitor to see a full feature-by-feature report and wishlist gaps.",
  gaps: "AI-evaluated gaps between your product and each rival.",
  alerts: "Only specialties competitors have that you still lack.",
  wishlist: "Features you marked for build — open a development plan and push to Jira.",
  reports: "Every intel run report. Auto daily + manual trigger anytime.",
  radar: "Trends, sentiment, snapshots, and tracking jobs for this client.",
};

function tabFromQuery(raw: string | null): Tab {
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
  const [gaps, setGaps] = useState<any[]>([]);
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
  const [intelOpen, setIntelOpen] = useState(false);
  const [intelPhase, setIntelPhase] = useState<IntelRunPhase>("running");
  const [intelSuccess, setIntelSuccess] = useState("");
  const [intelError, setIntelError] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const intelProgress = useIntelProgress(intelOpen && intelPhase === "running");
  const [featureForm, setFeatureForm] = useState({ name: "", category: "General", description: "" });
  const [compForm, setCompForm] = useState({ name: "", website: "" });

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get("tab")));
  }, [searchParams]);

  async function loadAll() {
    const soft = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
    const [c, comps, feats, g, a, r, loop, wish, tr, sent, snaps, j] = await Promise.all([
      api<any>(`/api/clients/${clientId}`),
      soft(api<any[]>(`/api/clients/${clientId}/competitors`), []),
      soft(api<any[]>(`/api/clients/${clientId}/features`), []),
      soft(api<any[]>(`/api/clients/${clientId}/gaps`), []),
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
    setGaps(g);
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
    if (tab === "competitors") {
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

  const gapsChartData = useMemo(() => {
    const byRival = new Map<string, number>();
    for (const gap of gaps) {
      const name = gap.competitor_name || "Rival";
      const weight = Math.max(1, (gap.leading || []).length || 1);
      byRival.set(name, (byRival.get(name) || 0) + weight);
    }
    return [...byRival.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [gaps]);

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
      const summary = `Intel run complete · features ${enrich?.features || 0} · rivals ${pack?.competitors || 0} · report ready.`;
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

  async function generateWeeklyBrief() {
    setBusy("brief");
    setError("");
    setMessage("");
    try {
      const brief = await api<any>(`/api/clients/${clientId}/weekly-brief`, { method: "POST" });
      await loadAll();
      setMessage(brief?.title ? `Weekly brief ready · ${brief.title}` : "Weekly brief generated");
      setTab("reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weekly brief failed");
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
      setMessage(`Added “${f.name}” to wishlist`);
      setSelectedFeatureId(f.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wishlist failed");
    } finally {
      setBusy("");
    }
  }

  async function openPlan(featureId: string) {
    setBusy("plan");
    setError("");
    setMessage("");
    try {
      const generated = await api<any[]>(`/api/clients/${clientId}/features/${featureId}/development-plan`, {
        method: "POST",
      });
      setSelectedFeatureId(featureId);
      setTickets(generated);
      setTab("wishlist");
      setMessage(`${generated.length} development tickets ready — review, then push to Jira when ready.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan failed");
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
        setMessage(`Pushed ${pushed} of ${created.length} tickets to Jira`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jira push failed");
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
      setError(err instanceof Error ? err.message : "Biqs push failed");
    } finally {
      setBusy("");
    }
  }

  async function addFeature(e: FormEvent) {
    e.preventDefault();
    await api(`/api/clients/${clientId}/features`, { method: "POST", body: JSON.stringify(featureForm) });
    setFeatureForm({ name: "", category: "General", description: "" });
    await loadAll();
  }

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    const created = await api<any>(`/api/clients/${clientId}/competitors`, {
      method: "POST",
      body: JSON.stringify(compForm),
    });
    setCompForm({ name: "", website: "" });
    await loadAll();
    setSelectedCompetitorId(created.id);
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
                <div className="font-medium text-[var(--ink)]">Loading company intelligence</div>
                <div className="text-sm text-[var(--muted)]">Pulling rivals, features, alerts, and reports…</div>
              </div>
            </div>
          </Card>
        )}
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "loop", label: "Weekly loop" },
    { id: "features", label: "Features", count: ownedFeatures.length },
    { id: "competitors", label: "Competitors", count: competitors.length },
    { id: "compare", label: "Comparison" },
    { id: "gaps", label: "Gaps", count: gaps.length },
    { id: "alerts", label: "Alerts", count: activeAlerts.length },
    { id: "wishlist", label: "Wishlist", count: wishlist.length },
    { id: "reports", label: "Reports", count: reports.length },
    { id: "radar", label: "Radar" },
  ];

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
        subtitle={`${client.industry || "Industry TBD"} · ${competitors.length} rivals tracked · daily intel + manual runs`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients">
              <Button variant="ghost">All clients</Button>
            </Link>
            <Link href={`/portal/${clientId}`}>
              <Button variant="ghost">Client GPT portal</Button>
            </Link>
            <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
              {busy === "pack" ? "Working…" : "Run intel now"}
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
            onClick={() => setTab(t.id)}
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
      <p className="text-sm text-[var(--muted)] mb-6">{TAB_HELP[tab]}</p>

      <div className="space-y-4 max-w-4xl">
        {tab === "loop" ? (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="font-semibold">Recommended next moves</h2>
                <Button onClick={generateWeeklyBrief} disabled={!!busy}>
                  {busy === "brief" ? "Generating..." : "Generate weekly brief"}
                </Button>
              </div>
              <ol className="text-sm text-[var(--muted)] list-decimal pl-5 space-y-1">
                {(weekly?.next_actions || []).map((a: string) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </Card>
            {(weekly?.recommendations || []).map((rec: any) => (
              <Card key={`${rec.type}-${rec.feature_name}-${rec.competitor_id}`}>
                <div className="text-xs uppercase text-[var(--accent)]">
                  {rec.type === "missing" ? "Competitor has · you don’t" : "Improve current feature"}
                </div>
                <div className="font-semibold mt-1">{rec.feature_name}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  vs {rec.competitor_name} · confidence {Math.round((rec.confidence_score || 0) * 100)}%
                </div>
                <p className="text-sm mt-2">{rec.recommendation}</p>
                <p className="text-sm text-[var(--muted)] mt-2">{rec.why}</p>
                <Button
                  className="mt-3"
                  disabled={!!busy}
                  onClick={() =>
                    addWishlist({
                      feature_name: rec.feature_name,
                      category: rec.category || "General",
                      description: rec.recommendation,
                    })
                  }
                >
                  Add to wishlist
                </Button>
              </Card>
            ))}
            {(weekly?.recommendations || []).length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">
                  No recommendations yet. Run intel to generate missing-feature and improvement suggestions.
                </p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "features" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-3">Add feature manually</h2>
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
                  <Label>One-line description</Label>
                  <Textarea rows={2} value={featureForm.description} onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })} />
                </div>
                <Button type="submit">Save feature</Button>
              </form>
            </Card>
            {ownedFeatures.map((f) => (
              <Card key={f.id}>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-[var(--muted)]">{f.category}</div>
                <p className="text-sm text-[var(--muted)] mt-1">{f.description || "No description yet"}</p>
              </Card>
            ))}
            {!ownedFeatures.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">
                  No owned features yet. Run intel to auto-fetch or add manually above.
                </p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "competitors" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-3">Add competitor manually</h2>
              <form onSubmit={addCompetitor} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={compForm.name} onChange={(e) => setCompForm({ ...compForm, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={compForm.website} onChange={(e) => setCompForm({ ...compForm, website: e.target.value })} />
                </div>
                <Button type="submit">Add competitor</Button>
              </form>
            </Card>
            <Card>
              <Label>Select competitor</Label>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={selectedCompetitorId}
                onChange={(e) => setSelectedCompetitorId(e.target.value)}
              >
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · threat {c.threat_level} · overlap {Math.round(c.overlap_score || 0)}%
                    {c.is_pinned ? " · pinned" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-3 space-y-2">
                {competitors.map((c) => (
                  <div
                    key={c.id}
                    className={`w-full rounded-xl border px-3 py-3 ${
                      selectedCompetitorId === c.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"
                    }`}
                  >
                    <button type="button" onClick={() => setSelectedCompetitorId(c.id)} className="w-full text-left">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{c.name}</div>
                        {c.is_pinned ? (
                          <span className="text-xs uppercase text-[var(--accent)]">pinned</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        threat {c.threat_level} · overlap {Math.round(c.overlap_score || 0)}%
                      </div>
                    </button>
                    <Button
                      className="mt-2"
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() => togglePin(c.id, !!c.is_pinned)}
                    >
                      {busy === `pin-${c.id}` ? "Updating..." : c.is_pinned ? "Unpin" : "Pin"}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
            {competitors.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">No competitors tracked yet.</p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
            {competitorDetail ? (
              <Card>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-lg">{competitorDetail.name}</div>
                  {competitorDetail.is_pinned ? (
                    <span className="text-xs uppercase text-[var(--accent)]">pinned</span>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--muted)] mt-2">
                  {competitorDetail.description || competitorDetail.why_dangerous || "No short description yet"}
                </p>
                {competitorDetail.website ? (
                  <a className="text-sm text-[var(--accent)] mt-3 inline-block" href={competitorDetail.website} target="_blank" rel="noreferrer">
                    {competitorDetail.website}
                  </a>
                ) : null}
                <h3 className="font-semibold mt-5 mb-2">Competitor features</h3>
                <div className="space-y-3">
                  {(competitorDetail.features || []).map((f: any, idx: number) => (
                    <div key={`${f.name}-${idx}`} className="border-b border-[var(--line)] pb-3">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-[var(--muted)]">{f.category || f.status || "Feature"}</div>
                      <p className="text-sm text-[var(--muted)] mt-1">{f.description || "—"}</p>
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
                        Add to wishlist
                      </Button>
                    </div>
                  ))}
                  {(competitorDetail.features || []).length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--muted)]">No features listed for this rival yet.</p>
                      <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                        {busy === "pack" ? "Working…" : "Run intel now"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "compare" ? (
          <>
            <Card>
              <Label>Competitor</Label>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                value={selectedCompetitorId}
                onChange={(e) => setSelectedCompetitorId(e.target.value)}
              >
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedCompetitor ? (
                <p className="text-sm text-[var(--muted)] mt-3">
                  Full feature report vs {selectedCompetitor.name}
                  {selectedCompetitor.website ? (
                    <>
                      {" "}
                      ·{" "}
                      <a className="text-[var(--accent)]" href={selectedCompetitor.website} target="_blank" rel="noreferrer">
                        website
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </Card>
            <Card>
              <FeatureStanceChart
                title="How you compare"
                hint="Quick view of where this client is ahead, even, or behind the selected competitor."
                youLead={compareStance.youLead}
                parity={compareStance.parity}
                theyLead={compareStance.theyLead}
                rivalName={selectedCompetitor?.name}
              />
            </Card>
            {comparisons.map((row) => (
              <Card key={row.id}>
                <div className="font-semibold">{row.feature_name}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  us {row.our_status} · them {row.competitor_status} · confidence {Math.round((row.confidence_score || 0) * 100)}%
                </div>
                <p className="text-sm mt-3">{row.note}</p>
                <div className="mt-3 rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
                  <div className="text-xs uppercase text-[var(--muted)] mb-1">How competitor leads</div>
                  {row.how_competitor_leads}
                </div>
                <div className="mt-3 rounded-xl border border-[var(--line)] p-3 text-sm">
                  <div className="text-xs uppercase text-[var(--muted)] mb-1">How to improve</div>
                  {row.how_to_improve}
                </div>
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
                    Add feature to wishlist
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => sendFeedback("comparison", row.id, "useful")}
                  >
                    Useful
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => sendFeedback("comparison", row.id, "useless")}
                  >
                    Useless
                  </Button>
                </div>
              </Card>
            ))}
            {!comparisons.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">No comparison rows for this rival yet.</p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "gaps" ? (
          <>
            <Card>
              <GapsByRivalChart data={gapsChartData} />
            </Card>
            {gaps.map((gap) => (
              <Card key={gap.id}>
                <div className="font-semibold">{gap.competitor_name}</div>
                <div className="text-xs text-[var(--muted)]">confidence {Math.round((gap.confidence_score || 0) * 100)}%</div>
                <p className="text-sm mt-2">{gap.summary}</p>
                {(gap.leading || []).length ? (
                  <div className="mt-3 text-sm">
                    <div className="text-xs uppercase text-[var(--muted)] mb-1">They lead</div>
                    <ul className="list-disc pl-5 text-[var(--muted)]">
                      {(gap.leading || []).slice(0, 6).map((x: string) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(gap.opportunities || []).length ? (
                  <div className="mt-3 text-sm">
                    <div className="text-xs uppercase text-[var(--muted)] mb-1">Opportunities</div>
                    <ul className="list-disc pl-5 text-[var(--muted)]">
                      {(gap.opportunities || []).slice(0, 6).map((x: string) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("gap", gap.id, "useful")}>
                    Useful
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("gap", gap.id, "useless")}>
                    Useless
                  </Button>
                </div>
              </Card>
            ))}
            {!gaps.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">No gaps yet.</p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "alerts" ? (
          <>
            {activeAlerts.map((alert) => (
              <Card key={alert.id}>
                <div className="font-semibold">{alert.title}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  Specialty from {alert.competitor_trigger || "rival"} · {alert.impact}
                </div>
                <p className="text-sm mt-2">{alert.why_it_matters}</p>
                <p className="text-sm text-[var(--muted)] mt-2">Action: {alert.action}</p>
                {alert.content_draft ? (
                  <div className="mt-3 rounded-xl border border-[var(--line)] p-3 text-sm whitespace-pre-wrap">{alert.content_draft}</div>
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
                    Add to wishlist
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => markAlertDone(alert.id)}>
                    {busy === `alert-${alert.id}` ? "Updating..." : "Mark done"}
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("alert", alert.id, "useful")}>
                    Useful
                  </Button>
                  <Button variant="ghost" disabled={!!busy} onClick={() => sendFeedback("alert", alert.id, "useless")}>
                    Useless
                  </Button>
                </div>
              </Card>
            ))}
            {!activeAlerts.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)] mb-3">
                  No competitor-specialty alerts yet (features they have that you don’t).
                </p>
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "wishlist" ? (
          <>
            <Card>
              <Label>Wishlist feature</Label>
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
                  {busy === "plan" ? "Building plan..." : "Show development plan & tickets"}
                </Button>
                <Button onClick={pushJira} disabled={!tickets.length || !!busy}>
                  {busy === "jira" ? "Pushing..." : "Add tickets to Jira"}
                </Button>
                <Button variant="ghost" onClick={pushBiqs} disabled={!tickets.length || !!busy}>
                  {busy === "biqs" ? "Adding..." : "Add tickets to Biqs"}
                </Button>
              </div>
              <p className="mt-3 text-sm text-[var(--muted)]">
                No Jira? Use Biqs — the built-in board with Backlog, To do, In progress, In review, and Done.
              </p>
            </Card>
            {wishlist.map((f) => (
              <Card key={f.id}>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-[var(--muted)]">{f.category}</div>
                <p className="text-sm text-[var(--muted)] mt-1">{f.description || "Wishlisted feature"}</p>
                <Button className="mt-3" variant="ghost" onClick={() => openPlan(f.id)}>
                  Development plan
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
                <p className="text-sm mt-3 whitespace-pre-wrap">{t.body}</p>
                <ul className="mt-3 list-disc pl-5 text-sm text-[var(--muted)]">
                  {(t.acceptance_criteria || []).map((c: string) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Card>
            ))}
            {!wishlist.length ? (
              <Card>
                <p className="text-sm text-[var(--muted)]">Wishlist is empty. Add features from Weekly loop, Comparison, or Alerts.</p>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "reports" ? (
          <>
            <Card>
              <h2 className="font-semibold mb-1">Intel reports</h2>
              <p className="text-sm text-[var(--muted)] mb-3">
                Runs automatically once every 24 hours. Trigger a fresh run anytime.
              </p>
              <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                {busy === "pack" ? "Working…" : "Run intel + generate report now"}
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
                <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                  {busy === "pack" ? "Working…" : "Run intel now"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === "radar" ? (
          <>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="font-semibold">Trends</h2>
                {!trends.length ? (
                  <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                    {busy === "pack" ? "Working…" : "Run intel now"}
                  </Button>
                ) : null}
              </div>
              <div className="space-y-3">
                {trends.map((t: any, idx: number) => (
                  <div key={t.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{t.topic || t.title || t.name || "Trend"}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {t.platform ? `${t.platform}` : null}
                      {t.velocity_score != null ? ` · velocity ${t.velocity_score}` : null}
                      {t.detected_at ? ` · ${new Date(t.detected_at).toLocaleString()}` : null}
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {t.summary || t.description || t.detail || "—"}
                    </p>
                  </div>
                ))}
                {!trends.length ? <p className="text-sm text-[var(--muted)]">No trends yet.</p> : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Sentiment</h2>
              <div className="space-y-3">
                {sentiment.map((s: any, idx: number) => (
                  <div key={s.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{s.subject || s.label || s.source || s.topic || "Sentiment"}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {s.score != null ? `score ${s.score}` : null}
                      {s.label ? ` · ${s.label}` : null}
                      {s.polarity ? ` · ${s.polarity}` : null}
                      {s.source ? ` · ${s.source}` : null}
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {(s.sample_quotes || []).length
                        ? (s.sample_quotes || []).slice(0, 2).join(" · ")
                        : s.summary || s.note || s.description || "—"}
                    </p>
                  </div>
                ))}
                {!sentiment.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--muted)]">No sentiment data yet.</p>
                    <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                      {busy === "pack" ? "Working…" : "Run intel now"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Snapshots</h2>
              <div className="space-y-3">
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
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {snap.summary || snap.note || snap.description || "Captured competitor snapshot"}
                    </p>
                  </div>
                ))}
                {!snapshots.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--muted)]">No snapshots yet.</p>
                    <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                      {busy === "pack" ? "Working…" : "Run intel now"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold mb-2">Tracking jobs</h2>
              <div className="space-y-3">
                {jobs.map((job: any, idx: number) => (
                  <div key={job.id || idx} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{job.job_type || job.name || job.title || job.type || "Job"}</div>
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
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {job.detail || job.summary || job.message || job.description || "—"}
                    </p>
                  </div>
                ))}
                {!jobs.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--muted)]">No tracking jobs yet.</p>
                    <Button onClick={() => setSetupOpen(true)} disabled={!!busy}>
                      {busy === "pack" ? "Working…" : "Run intel now"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
