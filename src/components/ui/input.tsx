import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text shadow-sm outline-none transition placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}
