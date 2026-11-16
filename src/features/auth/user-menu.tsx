"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { getInitials } from "@/lib/user";

export function UserMenu({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(fullName) || "U";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label={`Menu akun ${fullName}`}
        title={fullName}
        className="bg-brand inline-flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold text-white shadow-sm ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {initials}
      </button>

      {open ? (
        <div
          id="user-menu"
          role="menu"
          aria-label="Menu akun"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-card"
        >
          <div className="border-b border-border bg-surface-muted/60 px-4 py-3">
            <p className="truncate text-sm font-semibold text-text">{fullName}</p>
            <p className="mt-0.5 truncate text-xs text-text-secondary">{email}</p>
          </div>

          <div className="p-1.5">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-muted hover:text-text"
            >
              <UserRound
                className="h-4 w-4 text-text-muted"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              Profil saya
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={pending}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              {pending ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
