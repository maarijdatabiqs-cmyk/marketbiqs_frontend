export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl tracking-tight text-[var(--ink)] break-words">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm sm:text-base text-[var(--muted)] max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-white hover:brightness-110"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-black/5";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 sm:px-4 text-sm font-medium transition disabled:opacity-50 touch-manipulation ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full min-w-0 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] ${props.className || ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full min-w-0 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] ${props.className || ""}`}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{children}</label>;
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl tabular-nums break-all">
        {value}
      </div>
    </Card>
  );
}
