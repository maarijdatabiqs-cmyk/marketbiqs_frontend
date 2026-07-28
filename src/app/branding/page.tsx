"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function toColorInput(value: string | null | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return fallback.toLowerCase();
}

export default function BrandingPage() {
  const { agency, refresh } = useAuth();
  const [form, setForm] = useState({
    name: "",
    logo_url: "",
    brand_color: "#0f766e",
    brand_secondary: "#134e4a",
    report_footer: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agency) return;
    setForm({
      name: agency.name || "",
      logo_url: agency.logo_url || "",
      brand_color: toColorInput(agency.brand_color, "#0f766e"),
      brand_secondary: toColorInput(agency.brand_secondary, "#134e4a"),
      report_footer: agency.report_footer || "",
    });
  }, [agency]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api("/api/agency/branding", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          brand_color: toColorInput(form.brand_color, "#0f766e"),
          brand_secondary: toColorInput(form.brand_secondary, "#134e4a"),
          logo_url: form.logo_url.trim() || null,
          report_footer: form.report_footer.trim() || null,
        }),
      });
      await refresh();
      setMessage("Branding saved. Sidebar, accents, and new PDFs now use these settings.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Agency branding"
        subtitle="White-label PDF reports and workspace accents use these settings."
      />
      {error ? <p className="text-red-600 mb-4">{error}</p> : null}
      {message ? <p className="text-[var(--accent)] mb-4">{message}</p> : null}
      <Card className="max-w-2xl">
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <Label>Agency name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Primary brand color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  className="h-11 w-16 p-1"
                  value={form.brand_color}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                />
                <Input
                  value={form.brand_color}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                  placeholder="#0f766e"
                />
              </div>
            </div>
            <div>
              <Label>Secondary brand color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  className="h-11 w-16 p-1"
                  value={form.brand_secondary}
                  onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })}
                />
                <Input
                  value={form.brand_secondary}
                  onChange={(e) => setForm({ ...form, brand_secondary: e.target.value })}
                  placeholder="#134e4a"
                />
              </div>
            </div>
          </div>
          <div
            className="rounded-xl border border-[var(--line)] p-4"
            style={{
              background: `linear-gradient(135deg, ${form.brand_color}22, ${form.brand_secondary}18)`,
            }}
          >
            <div className="text-sm text-[var(--muted)] mb-2">Live preview</div>
            <div className="font-[family-name:var(--font-display)] text-2xl" style={{ color: form.brand_color }}>
              {form.name || "Agency name"}
            </div>
            <button
              type="button"
              className="mt-3 rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: form.brand_color }}
            >
              Sample button
            </button>
          </div>
          <div>
            <Label>Report footer</Label>
            <Textarea rows={3} value={form.report_footer} onChange={(e) => setForm({ ...form, report_footer: e.target.value })} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save branding"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
