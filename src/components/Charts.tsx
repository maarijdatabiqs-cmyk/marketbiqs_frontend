"use client";

type Point = { label: string; value: number };
type ActivityPoint = {
  label: string;
  reports: number;
  tickets: number;
  alerts: number;
  deliveries: number;
  scrapes: number;
};
type UsageBar = { label: string; used: number; quota: number };

function ChartHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-[var(--ink)]">{title}</div>
      {hint ? <p className="mt-1 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-[var(--muted)] py-2">{message}</p>;
}

export function BarChart({
  title,
  hint,
  data,
  color = "var(--accent)",
  emptyMessage = "Nothing to show yet. Run intel on a client first.",
}: {
  title: string;
  hint?: string;
  data: Point[];
  color?: string;
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div>
      <ChartHeader title={title} hint={hint} />
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-3">
          {data.map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-[var(--ink)]" title={d.label}>
                    {d.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">
                    {d.value}
                    <span className="text-[var(--muted)]/70"> · {pct}%</span>
                  </span>
                </div>
                <div className="h-3 rounded-full bg-black/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${(d.value / max) * 100}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function UsageMeters({ title, hint, data }: { title: string; hint?: string; data: UsageBar[] }) {
  return (
    <div>
      <ChartHeader title={title} hint={hint} />
      <div className="space-y-3">
        {data.map((d) => {
          const pct = d.quota > 0 ? Math.min(100, Math.round((d.used / d.quota) * 100)) : 0;
          return (
            <div key={d.label}>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-sm mb-1">
                <span className="min-w-0 break-words font-medium">{d.label}</span>
                <span className="text-[var(--muted)] tabular-nums shrink-0">
                  {d.used} of {d.quota} used · {pct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Simple daily stacked bars — easier to read than overlapping lines. */
export function ActivityChart({
  title,
  hint,
  data,
}: {
  title: string;
  hint?: string;
  data: ActivityPoint[];
}) {
  const keys = [
    { key: "reports" as const, color: "#0F766E", label: "Reports" },
    { key: "tickets" as const, color: "#0369A1", label: "Tickets" },
    { key: "alerts" as const, color: "#B45309", label: "Alerts" },
    { key: "deliveries" as const, color: "#7C3AED", label: "Deliveries" },
  ];
  const totals = data.map((d) => d.reports + d.tickets + d.alerts + d.deliveries);
  const max = Math.max(1, ...totals);
  const empty = totals.every((t) => t === 0);

  return (
    <div>
      <ChartHeader title={title} hint={hint} />
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        {keys.map((k) => (
          <span key={k.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>
      {empty ? (
        <EmptyState message="No work logged in the last 2 weeks yet. Run intel to fill this in." />
      ) : (
        <div className="space-y-2">
          {data.map((d) => {
            const dayTotal = d.reports + d.tickets + d.alerts + d.deliveries;
            if (dayTotal === 0) {
              return (
                <div key={d.label} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs sm:text-sm">
                  <span className="text-[var(--muted)] tabular-nums">{d.label}</span>
                  <div className="h-3 rounded-full bg-black/[0.04]" />
                  <span className="text-right tabular-nums text-[var(--muted)]">0</span>
                </div>
              );
            }
            return (
              <div key={d.label} className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2 text-xs sm:text-sm">
                <span className="text-[var(--muted)] tabular-nums">{d.label}</span>
                <div
                  className="flex h-3 overflow-hidden rounded-full bg-black/5"
                  style={{ width: `${Math.max(8, (dayTotal / max) * 100)}%` }}
                  title={`Reports ${d.reports}, Tickets ${d.tickets}, Alerts ${d.alerts}, Deliveries ${d.deliveries}`}
                >
                  {keys.map((k) => {
                    const value = d[k.key];
                    if (!value) return null;
                    return (
                      <div
                        key={k.key}
                        className="h-full"
                        style={{ width: `${(value / dayTotal) * 100}%`, background: k.color }}
                      />
                    );
                  })}
                </div>
                <span className="text-right tabular-nums font-medium">{dayTotal}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DonutChart({
  title,
  hint,
  data,
  emptyMessage = "Nothing to show yet. Run intel on a client first.",
}: {
  title: string;
  hint?: string;
  data: Point[];
  emptyMessage?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const safeTotal = total || 1;
  const colors = ["#0F766E", "#0369A1", "#B45309", "#7C3AED", "#BE123C", "#64748B"];
  let angle = -90;
  const slices = data.map((d, i) => {
    const sweep = (d.value / safeTotal) * 360;
    const start = angle;
    angle += sweep;
    const pct = total ? Math.round((d.value / total) * 100) : 0;
    return { ...d, start, sweep, color: colors[i % colors.length], pct };
  });

  function arc(startDeg: number, sweepDeg: number) {
    if (sweepDeg >= 360) sweepDeg = 359.99;
    const r = 36;
    const cx = 50;
    const cy = 50;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(startDeg + sweepDeg));
    const y2 = cy + r * Math.sin(toRad(startDeg + sweepDeg));
    const large = sweepDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div>
      <ChartHeader title={title} hint={hint} />
      {data.length === 0 || total === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative shrink-0">
            <svg viewBox="0 0 100 100" className="h-28 w-28 sm:h-32 sm:w-32">
              {slices.map((s) => (
                <path key={s.label} d={arc(s.start, s.sweep)} fill={s.color} />
              ))}
              <circle cx="50" cy="50" r="22" fill="var(--panel)" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-[family-name:var(--font-display)] text-xl tabular-nums leading-none">{total}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">total</div>
            </div>
          </div>
          <div className="w-full space-y-2 text-sm min-w-0">
            {slices.map((s) => (
              <div key={s.label} className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="truncate text-[var(--ink)]">{s.label}</span>
                <span className="ml-auto shrink-0 tabular-nums text-[var(--muted)]">
                  {s.value} <span className="text-[var(--muted)]/70">({s.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ColumnChart({
  title,
  hint,
  data,
  color = "var(--accent)",
  emptyMessage = "Nothing to show yet. Run intel on a client first.",
}: {
  title: string;
  hint?: string;
  data: Point[];
  color?: string;
  emptyMessage?: string;
}) {
  // Prefer horizontal bars for readability (client names stay readable).
  return <BarChart title={title} hint={hint} data={data} color={color} emptyMessage={emptyMessage} />;
}

export function AreaChart({
  title,
  hint,
  data,
  color = "#0F766E",
}: {
  title: string;
  hint?: string;
  data: Point[];
  color?: string;
}) {
  return (
    <BarChart
      title={title}
      hint={hint}
      data={data}
      color={color}
      emptyMessage="No research activity in the last 2 weeks yet."
    />
  );
}

type GroupedPoint = {
  label: string;
  rivals: number;
  features: number;
  wishlist: number;
  tickets: number;
};

/** One simple score per client instead of 4 overlapping bar groups. */
export function GroupedBarChart({ title, hint, data }: { title: string; hint?: string; data: GroupedPoint[] }) {
  const flattened = data.map((d) => ({
    label: d.label,
    value: d.rivals + d.features + d.wishlist + d.tickets,
  }));
  return (
    <div>
      <BarChart
        title={title}
        hint={hint || "Higher bars mean richer intel for that brand (rivals + features + wishlist + tickets)."}
        data={flattened}
        emptyMessage="No clients yet."
      />
      {data.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Tip: open a client to see the full breakdown of rivals, features, wishlist, and tickets.
        </p>
      ) : null}
    </div>
  );
}

/** Compact stacked bar: your features vs rival gaps vs threats. */
export function RivalPulseBar({
  features,
  gaps,
  threats,
  showLegend = false,
  className = "",
}: {
  features: number;
  gaps: number;
  threats: number;
  showLegend?: boolean;
  className?: string;
}) {
  const you = Math.max(0, features);
  const gap = Math.max(0, gaps);
  const threat = Math.max(0, threats);
  const total = Math.max(1, you + gap + threat);
  const segments = [
    { key: "you", value: you, color: "var(--accent)", label: "Yours" },
    { key: "gaps", value: gap, color: "#B45309", label: "Rival gaps" },
    { key: "threats", value: threat, color: "#DC2626", label: "Threats" },
  ].filter((s) => s.value > 0);

  if (you + gap + threat === 0) {
    return (
      <div
        className={`h-2.5 w-full max-w-[7.5rem] rounded-full bg-black/5 ${className}`}
        title="No compare data yet"
      />
    );
  }

  return (
    <div className={`w-full min-w-[6.5rem] ${className}`}>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-black/5"
        title={`You have ${you} · Missing ${gap} · Warnings ${threat}`}
        role="img"
        aria-label={`You have ${you}, missing ${gap}, warnings ${threat}`}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full transition-[width]"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      {showLegend ? (
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--muted)]">
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            You have {you}
          </span>
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-700" />
            Missing {gap}
          </span>
          <span>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-600" />
            Warnings {threat}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Side-by-side stance bars for one rival comparison. */
export function FeatureStanceChart({
  title,
  hint,
  youLead,
  parity,
  theyLead,
  rivalName,
}: {
  title?: string;
  hint?: string;
  youLead: number;
  parity: number;
  theyLead: number;
  rivalName?: string;
}) {
  const rows = [
    { label: "You’re ahead", value: youLead, color: "var(--accent)" },
    { label: "About the same", value: parity, color: "#64748B" },
    { label: rivalName ? `${rivalName} is ahead` : "Competitor is ahead", value: theyLead, color: "#B45309" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = youLead + parity + theyLead;

  return (
    <div>
      {title ? <ChartHeader title={title} hint={hint} /> : null}
      {total === 0 ? (
        <EmptyState message="No comparison yet. Check competitors for this brand first." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-[var(--ink)]">{r.label}</span>
                <span className="tabular-nums text-[var(--muted)]">{r.value}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-[var(--muted)]">
            {total} feature{total === 1 ? "" : "s"} compared · amber means the competitor is ahead.
          </p>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars of gap pressure by rival. */
export function GapsByRivalChart({
  title = "Where competitors are ahead",
  hint = "Longer bars mean more missing features vs that competitor.",
  data,
}: {
  title?: string;
  hint?: string;
  data: { label: string; value: number }[];
}) {
  return (
    <BarChart
      title={title}
      hint={hint}
      data={data}
      color="#B45309"
      emptyMessage="No missing features yet. Check competitors to compare."
    />
  );
}
