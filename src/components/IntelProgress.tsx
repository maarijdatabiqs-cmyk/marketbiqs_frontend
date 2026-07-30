"use client";

import { useEffect, useMemo, useState } from "react";

export const INTEL_STEPS = [
  {
    id: "scan",
    title: "Scanning brand signals",
    detail: "Reading website, positioning, and product clues…",
  },
  {
    id: "rivals",
    title: "Finding competitors",
    detail: "Discovering high-risk rivals in the same space…",
  },
  {
    id: "features",
    title: "Mapping features",
    detail: "Pulling owned and rival capabilities into one inventory…",
  },
  {
    id: "gaps",
    title: "Comparing gaps",
    detail: "Spotting missing features, alerts, and wishlist ideas…",
  },
  {
    id: "report",
    title: "Writing the report",
    detail: "Turning findings into a client-ready intelligence brief…",
  },
  {
    id: "finish",
    title: "Packaging results",
    detail: "Saving snapshots, jobs, and refreshing your workspace…",
  },
] as const;

const TIPS = [
  "Tip: Pin a rival after this run to keep them in every weekly loop.",
  "Tip: Open Alerts next — that’s where specialty gaps show up.",
  "Tip: Ask the AI assistant about this brand once intel finishes.",
  "Tip: Longer runs usually mean richer rival coverage.",
  "Tip: Wishlist a gap, then push a Jira ticket from Wishlist.",
];

function formatElapsed(ms: number) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export type IntelRunPhase = "running" | "success" | "error";

type IntelProgressOverlayProps = {
  open: boolean;
  phase: IntelRunPhase;
  clientName?: string;
  stepIndex: number;
  progress: number;
  elapsedMs: number;
  tipIndex: number;
  successMessage?: string;
  errorMessage?: string;
  onDismiss?: () => void;
};

export function IntelProgressOverlay({
  open,
  phase,
  clientName,
  stepIndex,
  progress,
  elapsedMs,
  tipIndex,
  successMessage,
  errorMessage,
  onDismiss,
}: IntelProgressOverlayProps) {
  if (!open) return null;

  const active = INTEL_STEPS[Math.min(stepIndex, INTEL_STEPS.length - 1)];
  const tip = TIPS[tipIndex % TIPS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(20,35,31,0.42)] p-4 backdrop-blur-[2px] sm:items-center">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(20,35,31,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intel-progress-title"
      >
        <div className="relative overflow-hidden border-b border-[var(--line)] px-5 py-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at 12% 20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 42%), linear-gradient(135deg, #f7f4ec, #eef7f4)",
            }}
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                  {phase === "running" ? "Working" : phase === "success" ? "Done" : "Needs attention"}
                </p>
                <h2 id="intel-progress-title" className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  {phase === "running"
                    ? "Running intelligence"
                    : phase === "success"
                      ? "Intel ready"
                      : "Intel run stalled"}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {clientName ? (
                    <>
                      Building a fresh picture for <span className="font-medium text-[var(--ink)]">{clientName}</span>
                    </>
                  ) : (
                    "Scanning rivals, features, and gaps"
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Elapsed</div>
                <div className="font-medium tabular-nums text-[var(--ink)]">{formatElapsed(elapsedMs)}</div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  phase === "error" ? "bg-red-500" : "bg-[var(--accent)]"
                }`}
                style={{
                  width: `${phase === "success" ? 100 : phase === "error" ? Math.max(progress, 18) : Math.min(progress, 94)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {phase === "running" ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white/60 px-3 py-3">
                <span className="relative flex h-9 w-9 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-soft)] opacity-70" />
                  <span className="relative h-3 w-3 rounded-full bg-[var(--accent)]" />
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-[var(--ink)]">{active.title}</div>
                  <div className="text-sm text-[var(--muted)]">{active.detail}</div>
                </div>
              </div>

              <ol className="space-y-2">
                {INTEL_STEPS.map((step, index) => {
                  const done = index < stepIndex;
                  const current = index === stepIndex;
                  return (
                    <li
                      key={step.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        current ? "bg-[var(--accent-soft)]" : done ? "opacity-80" : "opacity-45"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          done
                            ? "bg-[var(--accent)] text-white"
                            : current
                              ? "border border-[var(--accent)] text-[var(--accent)]"
                              : "border border-[var(--line)] text-[var(--muted)]"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <span className={current ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"}>
                        {step.title}
                      </span>
                      {current ? (
                        <span className="ml-auto flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]" />
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>

              <p className="mt-4 rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-[var(--muted)]">{tip}</p>
            </>
          ) : null}

          {phase === "success" ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-[var(--ink)]">
                {successMessage || "Intelligence run finished. Fresh rivals, features, and reports are ready."}
              </p>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
              >
                View results
              </button>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-red-700">
                {errorMessage || "Something went wrong while running intel."}
              </p>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-black/5"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Drives staged progress while a long intel request is in flight. */
export function useIntelProgress(active: boolean) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(6);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const startedAt = useMemo(() => (active ? Date.now() : 0), [active]);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setProgress(6);
      setElapsedMs(0);
      setTipIndex(0);
      return;
    }

    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
      setProgress((p) => Math.min(p + (p < 40 ? 3.2 : p < 70 ? 1.6 : 0.55), 94));
      setStepIndex((s) => {
        const next = Math.min(Math.floor((Date.now() - startedAt) / 4500), INTEL_STEPS.length - 1);
        return Math.max(s, next);
      });
    }, 400);

    const tips = window.setInterval(() => {
      setTipIndex((i) => i + 1);
    }, 7000);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(tips);
    };
  }, [active, startedAt]);

  return { stepIndex, progress, elapsedMs, tipIndex };
}
