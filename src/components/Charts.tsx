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

export function BarChart({
  title,
  data,
  color = "var(--accent)",
}: {
  title: string;
  data: Point[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div
              key={d.label}
              className="grid grid-cols-[minmax(0,4.5rem)_1fr_2rem] sm:grid-cols-[110px_1fr_40px] gap-1.5 sm:gap-2 items-center text-xs sm:text-sm"
            >
              <div className="truncate text-[var(--muted)]" title={d.label}>
                {d.label}
              </div>
              <div className="h-2.5 rounded-full bg-black/5 overflow-hidden min-w-0">
                <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
              </div>
              <div className="text-right tabular-nums">{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function UsageMeters({ title, data }: { title: string; data: UsageBar[] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="space-y-3">
        {data.map((d) => {
          const pct = d.quota > 0 ? Math.min(100, Math.round((d.used / d.quota) * 100)) : 0;
          return (
            <div key={d.label}>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-sm mb-1">
                <span className="min-w-0 break-words">{d.label}</span>
                <span className="text-[var(--muted)] tabular-nums shrink-0">
                  {d.used}/{d.quota} · {pct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-black/5 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityChart({ title, data }: { title: string; data: ActivityPoint[] }) {
  const keys = [
    { key: "reports" as const, color: "#0F766E", label: "Reports" },
    { key: "tickets" as const, color: "#0369A1", label: "Tickets" },
    { key: "alerts" as const, color: "#B45309", label: "Alerts" },
    { key: "deliveries" as const, color: "#7C3AED", label: "Deliveries" },
  ];
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.reports, d.tickets, d.alerts, d.deliveries]),
  );
  const w = 640;
  const h = 180;
  const pad = 24;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

  function pathFor(key: (typeof keys)[number]["key"]) {
    return data
      .map((d, i) => {
        const x = pad + i * step;
        const y = pad + innerH - (d[key] / max) * innerH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          {keys.map((k) => (
            <span key={k.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: k.color }} />
              {k.label}
            </span>
          ))}
        </div>
      </div>
      {data.every((d) => d.reports + d.tickets + d.alerts + d.deliveries === 0) ? (
        <p className="text-sm text-[var(--muted)]">No activity in the last 14 days yet. Run intel to populate.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto min-w-0">
          {[0, 0.5, 1].map((t) => {
            const y = pad + innerH * (1 - t);
            return <line key={t} x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(15,23,42,0.08)" />;
          })}
          {keys.map((k) => (
            <path key={k.key} d={pathFor(k.key)} fill="none" stroke={k.color} strokeWidth="2.5" strokeLinecap="round" />
          ))}
          {data.map((d, i) => (
            <text key={d.label} x={pad + i * step} y={h - 4} textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.45)">
              {i % 2 === 0 ? d.label : ""}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

export function DonutChart({ title, data }: { title: string; data: Point[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ["#0F766E", "#0369A1", "#B45309", "#7C3AED", "#BE123C", "#64748B"];
  let angle = -90;
  const slices = data.map((d, i) => {
    const sweep = (d.value / total) * 360;
    const start = angle;
    angle += sweep;
    return { ...d, start, sweep, color: colors[i % colors.length] };
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
      <div className="text-sm font-semibold mb-3">{title}</div>
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 mx-auto sm:mx-0">
            {slices.map((s) => (
              <path key={s.label} d={arc(s.start, s.sweep)} fill={s.color} />
            ))}
            <circle cx="50" cy="50" r="20" fill="var(--panel)" />
          </svg>
          <div className="w-full space-y-1.5 text-sm min-w-0">
            {slices.map((s) => (
              <div key={s.label} className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[var(--muted)] truncate">{s.label}</span>
                <span className="tabular-nums ml-auto shrink-0">{s.value}</span>
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
  data,
  color = "var(--accent)",
}: {
  title: string;
  data: Point[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 640;
  const h = 180;
  const padX = 28;
  const padY = 20;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2 - 16;
  const gap = 8;
  const barW = data.length ? Math.max(10, (innerW - gap * (data.length - 1)) / data.length) : 20;

  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          {[0, 0.5, 1].map((t) => {
            const y = padY + innerH * (1 - t);
            return <line key={t} x1={padX} x2={w - padX} y1={y} y2={y} stroke="rgba(15,23,42,0.08)" />;
          })}
          {data.map((d, i) => {
            const height = (d.value / max) * innerH;
            const x = padX + i * (barW + gap);
            const y = padY + innerH - height;
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barW} height={Math.max(height, 1)} rx={4} fill={color} opacity={0.9} />
                <text x={x + barW / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.45)">
                  {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
                </text>
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.55)">
                  {d.value}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export function AreaChart({
  title,
  data,
  color = "#0F766E",
}: {
  title: string;
  data: Point[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 640;
  const h = 170;
  const pad = 24;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = pad + innerH - (d.value / max) * innerH;
    return { x, y, ...d };
  });
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1].x},${pad + innerH} L${points[0].x},${pad + innerH} Z`
      : "";

  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      {data.every((d) => d.value === 0) ? (
        <p className="text-sm text-[var(--muted)]">No scrape activity in the last 14 days.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          {[0, 0.5, 1].map((t) => {
            const y = pad + innerH * (1 - t);
            return <line key={t} x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(15,23,42,0.08)" />;
          })}
          <path d={area} fill={color} opacity={0.16} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          {points.map((p, i) => (
            <text key={p.label} x={p.x} y={h - 4} textAnchor="middle" fontSize="9" fill="rgba(15,23,42,0.45)">
              {i % 2 === 0 ? p.label : ""}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

type GroupedPoint = {
  label: string;
  rivals: number;
  features: number;
  wishlist: number;
  tickets: number;
};

export function GroupedBarChart({ title, data }: { title: string; data: GroupedPoint[] }) {
  const series = [
    { key: "rivals" as const, color: "#0F766E", label: "Rivals" },
    { key: "features" as const, color: "#0369A1", label: "Features" },
    { key: "wishlist" as const, color: "#B45309", label: "Wishlist" },
    { key: "tickets" as const, color: "#7C3AED", label: "Tickets" },
  ];
  const max = Math.max(1, ...data.flatMap((d) => [d.rivals, d.features, d.wishlist, d.tickets]));
  const w = 720;
  const h = 210;
  const padX = 28;
  const padY = 24;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2 - 18;
  const groupW = data.length ? innerW / data.length : innerW;
  const barW = Math.max(6, (groupW - 16) / series.length);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No clients yet.</p>
      ) : (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          {[0, 0.5, 1].map((t) => {
            const y = padY + innerH * (1 - t);
            return <line key={t} x1={padX} x2={w - padX} y1={y} y2={y} stroke="rgba(15,23,42,0.08)" />;
          })}
          {data.map((d, i) => {
            const groupX = padX + i * groupW + 8;
            return (
              <g key={d.label}>
                {series.map((s, si) => {
                  const value = d[s.key];
                  const height = (value / max) * innerH;
                  const x = groupX + si * barW;
                  const y = padY + innerH - height;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={y}
                      width={Math.max(barW - 2, 4)}
                      height={Math.max(height, 1)}
                      rx={3}
                      fill={s.color}
                      opacity={0.9}
                    />
                  );
                })}
                <text
                  x={groupX + (series.length * barW) / 2}
                  y={h - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(15,23,42,0.45)"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
