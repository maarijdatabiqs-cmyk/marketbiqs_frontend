"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, PageHeader, Stat } from "@/components/ui";
import { api } from "@/lib/api";

export default function BillingPage() {
  const [budget, setBudget] = useState<any>(null);
  const [packs, setPacks] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setBudget(await api("/api/billing/budget"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function checkout() {
    setError("");
    setMessage("");
    try {
      const res = await api<any>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ add_client_packs: packs }),
      });
      if (res.url && res.mode === "stripe") {
        window.location.href = res.url;
        return;
      }
      setMessage(res.message || "Billing updated");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Agency billing"
        subtitle="Transparent monthly Agency plan with per-client add-on packs and usage-aware quotas."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}
      {budget ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Plan" value={budget.plan} />
            <Stat label="Clients" value={`${budget.active_clients}/${budget.max_clients}`} />
            <Stat label="Reports" value={`${budget.reports_used}/${budget.reports_quota}`} />
            <Stat label="Monthly est." value={`$${(budget.estimated_monthly_cents / 100).toFixed(0)}`} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <h2 className="font-semibold">Base Agency · $450/mo</h2>
              <p className="text-sm text-[var(--muted)] mt-2">
                Includes {budget.included_clients} clients. Status: {budget.billing_status}. BYOK discount: {budget.byok_discount_percent}%.
              </p>
              <div className="mt-4 text-sm">
                Scrape units: {budget.scrape_units_used}/{budget.scrape_quota}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold">Per-client add-on packs</h2>
              <p className="text-sm text-[var(--muted)] mt-2">
                $49 per pack. Each pack adds 1 client seat + 8 reports + 800 scrape units.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
                  value={packs}
                  onChange={(e) => setPacks(Number(e.target.value))}
                />
                <Button onClick={checkout}>Add packs / Stripe checkout</Button>
              </div>
              <p className="text-xs text-[var(--muted)] mt-3">
                Current packs: {budget.client_pack_count} · meters: reports {budget.reports_used}/{budget.reports_quota}, scrapes {budget.scrape_units_used}/{budget.scrape_quota}
              </p>
              <p className="text-xs text-[var(--muted)] mt-2">
                Set STRIPE_SECRET_KEY + price IDs for live Agency + pack checkout; otherwise packs apply locally in development.
              </p>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-[var(--muted)]">Loading billing...</div>
      )}
    </AppShell>
  );
}
