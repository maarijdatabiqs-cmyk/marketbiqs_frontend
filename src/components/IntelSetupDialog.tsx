"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export type IntelSetupOptions = {
  competitor_scope: "global" | "local";
  competitor_country?: string;
  competitor_count: number;
};

type IntelSetupDialogProps = {
  open: boolean;
  clientName?: string;
  defaultCountry?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (options: IntelSetupOptions) => void;
};

const COUNTRY_SUGGESTIONS = [
  "United States",
  "United Kingdom",
  "Pakistan",
  "India",
  "UAE",
  "Saudi Arabia",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
];

export function IntelSetupDialog({
  open,
  clientName,
  defaultCountry = "",
  busy = false,
  onCancel,
  onConfirm,
}: IntelSetupDialogProps) {
  const [scope, setScope] = useState<"global" | "local">("local");
  const [country, setCountry] = useState(defaultCountry);
  const [count, setCount] = useState(5);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (clientName ? `Run intel for ${clientName}` : "Run intelligence"),
    [clientName],
  );

  if (!open) return null;

  function submit() {
    setError("");
    if (scope === "local" && !country.trim()) {
      setError("Enter a country for local competitors.");
      return;
    }
    onConfirm({
      competitor_scope: scope,
      competitor_country: scope === "local" ? country.trim() : undefined,
      competitor_count: count,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(20,35,31,0.42)] p-4 backdrop-blur-[2px] sm:items-center">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(20,35,31,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intel-setup-title"
      >
        <div className="border-b border-[var(--line)] px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Before we scan</p>
          <h2 id="intel-setup-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose rival type and how many competitors to track (1–10).
          </p>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <Label>Competitor type</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope("local")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  scope === "local"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:bg-black/5"
                }`}
              >
                <div className="font-medium text-[var(--ink)]">Local / country</div>
                <div className="mt-0.5 text-xs">Rivals in one country</div>
              </button>
              <button
                type="button"
                onClick={() => setScope("global")}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  scope === "global"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:bg-black/5"
                }`}
              >
                <div className="font-medium text-[var(--ink)]">Global</div>
                <div className="mt-0.5 text-xs">International peers</div>
              </button>
            </div>
          </div>

          {scope === "local" ? (
            <div>
              <Label>Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Pakistan, United States, UAE"
                list="intel-country-suggestions"
                autoFocus
              />
              <datalist id="intel-country-suggestions">
                {COUNTRY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <Label>Number of competitors</Label>
              <span className="text-sm font-semibold tabular-nums text-[var(--ink)]">{count}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] px-5 py-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" onClick={submit} disabled={busy}>
            {busy ? "Starting…" : "Start intel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
