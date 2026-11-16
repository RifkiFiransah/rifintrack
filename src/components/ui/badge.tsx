import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "danger" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-secondary ring-border",
  success: "bg-success-soft text-success-text ring-success/15",
  danger: "bg-danger-soft text-danger ring-danger/15",
  warning: "bg-warning-soft text-warning-text ring-warning/15",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
