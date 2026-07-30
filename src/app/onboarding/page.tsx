"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";

export default function OnboardingPage() {
  const { refresh, agency } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    brand_color: "#0F766E",
    report_footer: "",
    first_client_name: "",
    first_client_website: "",
    first_competitor_name: "",
    first_competitor_website: "",
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/onboarding", { method: "POST", body: JSON.stringify(form) });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <PageHeader
        title="Instant agency onboarding"
        subtitle={`Welcome${agency ? `, ${agency.name}` : ""}. Brand your reports and add your first client in one pass.`}
      />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Brand color</Label>
              <Input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} />
            </div>
            <div>
              <Label>Report footer</Label>
              <Input value={form.report_footer} onChange={(e) => setForm({ ...form, report_footer: e.target.value })} placeholder="Prepared by your agency" />
            </div>
          </div>
          <div>
            <Label>First client name</Label>
            <Input value={form.first_client_name} onChange={(e) => setForm({ ...form, first_client_name: e.target.value })} required />
          </div>
          <div>
            <Label>Client website</Label>
            <Input value={form.first_client_website} onChange={(e) => setForm({ ...form, first_client_website: e.target.value })} placeholder="https://" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>First competitor</Label>
              <Input value={form.first_competitor_name} onChange={(e) => setForm({ ...form, first_competitor_name: e.target.value })} />
            </div>
            <div>
              <Label>Competitor website</Label>
              <Input value={form.first_competitor_website} onChange={(e) => setForm({ ...form, first_competitor_website: e.target.value })} />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Finish setup"}</Button>
        </form>
      </Card>
    </div>
  );
}
