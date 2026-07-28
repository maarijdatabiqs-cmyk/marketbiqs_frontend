"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  ActivityChart,
  AreaChart,
  BarChart,
  ColumnChart,
  DonutChart,
  GroupedBarChart,
  UsageMeters,
} from "@/components/Charts";
import { Button, Card, PageHeader, Stat } from "@/components/ui";
import { api } from "@/lib/api";

type Dashboard = {
  clients_count: number;
  competitors_count: number;
  reports_count: number;
  open_insights: number;
  recent_trends: { id: string; topic: string; platform: string; summary: string; velocity_score: number }[];
  recent_insights: { id: string; title: string; body: string; priority: string; client_id: string }[];
  usage: {
    active_clients: number;
    max_clients: number;
    reports_used: number;
    reports_quota: number;
    scrape_units_used: number;
    scrape_quota: number;
    estimated_monthly_cents: number;
    byok_discount_percent: number;
  };
  roi?: Record<string, number>;
  charts?: {
    activity?: any[];
    scrape_activity?: { label: string; value: number }[];
    threat_breakdown?: { label: string; value: number }[];
    delivery_breakdown?: { label: string; value: number }[];
    feature_split?: { label: string; value: number }[];
    alert_impact?: { label: string; value: number }[];
    comparison_posture?: { label: string; value: number }[];
    overlap_buckets?: { label: string; value: number }[];
    industry_mix?: { label: string; value: number }[];
    client_rivals?: { label: string; value: number }[];
    client_gaps?: { label: string; value: number }[];
    client_alerts?: { label: string; value: number }[];
    client_coverage?: { label: string; rivals: number; features: number; wishlist: number; tickets: number }[];
    usage_bars?: { label: string; used: number; quota: number }[];
    roi_bars?: { label: string; value: number }[];
    feedback?: { label: string; value: number }[];
  };
  portfolio?: {
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
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dashboard>("/api/agency/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Agency command center"
        subtitle="Live ROI, usage meters, and portfolio graphs from your real client intel."
        actions={
          <Link href="/clients">
            <Button>Open clients</Button>
          </Link>
        }
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {data ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Hours saved (est.)" value={data.roi?.hours_saved_estimate ?? 0} />
            <Stat label="Alerts acted on" value={data.roi?.alerts_acted_on ?? 0} />
            <Stat label="Tickets created" value={data.roi?.tickets_created ?? 0} />
            <Stat label="Reports this month" value={data.roi?.reports_delivered ?? 0} />
          </div>

          <Card>
            <ActivityChart title="14-day agency activity" data={data.charts?.activity || []} />
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <AreaChart title="14-day scrape volume" data={data.charts?.scrape_activity || []} color="#0369A1" />
            </Card>
            <Card>
              <GroupedBarChart title="Client coverage (rivals · features · wishlist · tickets)" data={data.charts?.client_coverage || []} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <ColumnChart title="Rivals tracked by client" data={data.charts?.client_rivals || []} />
            </Card>
            <Card>
              <ColumnChart title="Gap reports by client" data={data.charts?.client_gaps || []} color="#B45309" />
            </Card>
            <Card>
              <ColumnChart title="Alerts by client" data={data.charts?.client_alerts || []} color="#7C3AED" />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <UsageMeters title="Pack usage meters" data={data.charts?.usage_bars || []} />
            </Card>
            <Card>
              <BarChart title="ROI this month" data={data.charts?.roi_bars || []} />
            </Card>
            <Card>
              <DonutChart title="High-risk rival threat mix" data={data.charts?.threat_breakdown || []} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <DonutChart title="Owned vs wishlist features" data={data.charts?.feature_split || []} />
            </Card>
            <Card>
              <DonutChart title="Alert impact mix" data={data.charts?.alert_impact || []} />
            </Card>
            <Card>
              <DonutChart title="Comparison posture (you)" data={data.charts?.comparison_posture || []} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <BarChart title="Competitor overlap distribution" data={data.charts?.overlap_buckets || []} color="#0F766E" />
            </Card>
            <Card>
              <DonutChart title="Clients by industry" data={data.charts?.industry_mix || []} />
            </Card>
            <Card>
              <DonutChart title="Delivery reliability" data={data.charts?.delivery_breakdown || []} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <BarChart title="Insight quality feedback" data={data.charts?.feedback || []} color="#0369A1" />
            </Card>
            <Card>
              <div className="text-sm font-semibold mb-3">Portfolio snapshot</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <div className="text-[var(--muted)]">Clients</div>
                  <div className="text-2xl font-semibold tabular-nums mt-1">{data.clients_count}</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <div className="text-[var(--muted)]">Rivals tracked</div>
                  <div className="text-2xl font-semibold tabular-nums mt-1">{data.competitors_count}</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <div className="text-[var(--muted)]">Reports</div>
                  <div className="text-2xl font-semibold tabular-nums mt-1">{data.reports_count}</div>
                </div>
                <div className="rounded-xl border border-[var(--line)] p-3">
                  <div className="text-[var(--muted)]">Open insights</div>
                  <div className="text-2xl font-semibold tabular-nums mt-1">{data.open_insights}</div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Client portfolio pulse</h2>
              <Link href="/clients" className="text-sm text-[var(--accent)]">
                Manage all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted)] border-b border-[var(--line)]">
                    <th className="py-2 font-medium">Client</th>
                    <th className="py-2 font-medium">Rivals</th>
                    <th className="py-2 font-medium">Features</th>
                    <th className="py-2 font-medium">Gaps</th>
                    <th className="py-2 font-medium">Alerts</th>
                    <th className="py-2 font-medium">Reports</th>
                    <th className="py-2 font-medium">Tickets</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.portfolio || []).map((c) => (
                    <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-3">
                        <Link href={`/clients/${c.id}`} className="font-medium hover:text-[var(--accent)]">
                          {c.name}
                        </Link>
                        <div className="text-xs text-[var(--muted)]">{c.industry || "—"}</div>
                      </td>
                      <td className="py-3 tabular-nums">{c.rivals}</td>
                      <td className="py-3 tabular-nums">{c.features}</td>
                      <td className="py-3 tabular-nums">{c.gaps ?? 0}</td>
                      <td className="py-3 tabular-nums">{c.alerts ?? 0}</td>
                      <td className="py-3 tabular-nums">{c.reports}</td>
                      <td className="py-3 tabular-nums">{c.tickets}</td>
                      <td className="py-3">
                        <span className={c.is_active ? "text-[var(--accent)]" : "text-red-500"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.portfolio || []).length === 0 ? (
                <p className="text-sm text-[var(--muted)] mt-3">No clients yet.</p>
              ) : null}
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <h2 className="font-semibold mb-4">Recent trends</h2>
              <div className="space-y-3">
                {data.recent_trends.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Run intel on a client to populate trends.</p>
                ) : (
                  data.recent_trends.map((t) => (
                    <div key={t.id} className="border-b border-[var(--line)] pb-3 last:border-0">
                      <div className="font-medium">{t.topic}</div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        {t.platform} · velocity {t.velocity_score}
                      </div>
                      <p className="text-sm mt-1 text-[var(--muted)]">{t.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold mb-4">Recent insights</h2>
              <div className="space-y-3">
                {data.recent_insights.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">Insights appear after competitor scans.</p>
                ) : (
                  data.recent_insights.map((i) => (
                    <div key={i.id} className="border-b border-[var(--line)] pb-3 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{i.title}</div>
                        <span className="text-xs uppercase text-[var(--accent)]">{i.priority}</span>
                      </div>
                      <p className="text-sm mt-1 text-[var(--muted)] line-clamp-3">{i.body}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="animate-pulse text-[var(--muted)]">Loading dashboard...</div>
      )}
    </AppShell>
  );
}
