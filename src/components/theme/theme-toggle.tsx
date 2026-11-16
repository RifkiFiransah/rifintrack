"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.classList.toggle("dark");
    root.style.colorScheme = dark ? "dark" : "light";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Storage can be unavailable in private mode; theme still works this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ubah tema terang atau gelap"
      title="Ubah tema"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface/80 text-text-secondary shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      <Sun className="hidden h-5 w-5 dark:block" strokeWidth={1.8} aria-hidden="true" />
      <Moon className="h-5 w-5 dark:hidden" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
