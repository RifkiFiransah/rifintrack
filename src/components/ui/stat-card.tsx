import type { ReactNode } from "react";

type Tone = "neutral" | "income" | "expense";

const VALUE_TONES: Record<Tone, string> = {
  neutral: "text-text",
  income: "text-success-text",
  expense: "text-danger",
};

const TONE_STYLES: Record<Tone, { icon: string; accent: string }> = {
  neutral: {
    icon: "bg-primary-soft text-primary",
    accent: "bg-primary",
  },
  income: {
    icon: "bg-success-soft text-success-text",
    accent: "bg-success",
  },
  expense: {
    icon: "bg-danger-soft text-danger",
    accent: "bg-danger",
  },
};

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {label}
          </p>
          <p className={`mt-2 truncate text-2xl font-bold tracking-tight ${VALUE_TONES[tone]}`}>
            {value}
          </p>
        </div>
        {icon ? (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}
