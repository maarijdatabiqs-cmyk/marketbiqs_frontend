"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export type CompetitorRunMode = "update" | "add" | "replace";

export type IntelSetupOptions = {
  competitor_scope: "global" | "local";
  competitor_country?: string;
  competitor_count: number;
  /** update = refresh existing; add = find N new and keep previous; replace = clear auto rivals and find a fresh set */
  competitor_mode: CompetitorRunMode;
};

type IntelSetupDialogProps = {
  open: boolean;
  clientName?: string;
  defaultCountry?: string;
  existingCompetitorCount?: number;
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
  existingCompetitorCount = 0,
  busy = false,
  onCancel,
  onConfirm,
}: IntelSetupDialogProps) {
  const hasExisting = existingCompetitorCount > 0;
  const [scope, setScope] = useState<"global" | "local">("local");
  const [country, setCountry] = useState(defaultCountry);
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<CompetitorRunMode>(hasExisting ? "update" : "add");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCountry(defaultCountry);
    setMode(hasExisting ? "update" : "add");
    setError("");
  }, [open, defaultCountry, hasExisting]);

  const title = useMemo(
    () => (clientName ? `Run intel for ${clientName}` : "Run intelligence"),
    [clientName],
  );

  const countLabel =
    mode === "add"
      ? hasExisting
        ? `New competitors to add (kept with your ${existingCompetitorCount} existing)`
        : "Number of competitors to find"
      : mode === "replace"
        ? "How many fresh competitors to find"
        : `Existing competitors to refresh (you have ${existingCompetitorCount})`;

  const modeHelp =
    mode === "add"
      ? `We’ll search for exactly ${count} new competitor${count === 1 ? "" : "s"}${
          hasExisting ? " and keep your previous list." : "."
        }`
      : mode === "replace"
        ? `We’ll clear auto-found rivals${hasExisting ? ` (you have ${existingCompetitorCount})` : ""} and find exactly ${count} new one${count === 1 ? "" : "s"}. Manually pinned competitors stay.`
        : `We’ll refresh up to ${count} of your current rivals (no new names added).`;

  const submitLabel =
    mode === "add"
      ? `Add ${count} & run`
      : mode === "replace"
        ? `Replace with ${count} & run`
        : "Update & run";

  if (!open) return null;

  function submit() {
    setError("");
    if (scope === "local" && !country.trim()) {
      setError("Enter a country for local competitors.");
      return;
    }
    if (mode === "update" && !hasExisting) {
      setError("No competitors to update yet. Choose “Add new” or “Replace all” first.");
      return;
    }
    onConfirm({
      competitor_scope: scope,
      competitor_country: scope === "local" ? country.trim() : undefined,
      competitor_count: count,
      competitor_mode: mode,
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
            Update current rivals, add more, or replace the list with a fresh set.
          </p>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <Label>What should this run do?</Label>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:opacity-60"
              value={mode}
              onChange={(e) => setMode(e.target.value as CompetitorRunMode)}
              disabled={busy}
            >
              <option value="update" disabled={!hasExisting}>
                Update current — refresh rivals you already have
              </option>
              <option value="add">
                {hasExisting
                  ? `Add new — find more and keep your ${existingCompetitorCount} current`
                  : "Add new — discover competitors from scratch"}
              </option>
              <option value="replace">
                Replace all — clear auto-found list and find all-new rivals
              </option>
            </select>
            <p className="mt-2 text-xs text-[var(--muted)]">{modeHelp}</p>
          </div>

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
              <Label>{countLabel}</Label>
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
            {busy ? "Starting…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
