"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  countQueuedTransactions,
  flushQueuedTransactions,
} from "@/lib/offline-queue";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function subscribeQueue(callback: () => void) {
  window.addEventListener("rifintrack:queue-change", callback);

  return () => {
    window.removeEventListener("rifintrack:queue-change", callback);
  };
}

function getOnline() {
  return navigator.onLine;
}

export function OfflineSync() {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const pending = useSyncExternalStore(
    subscribeQueue,
    countQueuedTransactions,
    () => 0,
  );
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;

    setSyncing(true);
    try {
      const result = await flushQueuedTransactions();
      if (result.synced > 0) {
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    if (!online || pending === 0) return;

    const timer = window.setTimeout(() => {
      void sync();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [online, pending, sync]);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning bg-warning-soft px-4 py-2 text-sm text-warning-text"
    >
      <span>
        {online ? "" : "Kamu sedang offline. "}
        {pending > 0
          ? `${pending} transaksi menunggu sinkronisasi.`
          : "Transaksi baru akan disimpan dan dikirim saat online."}
      </span>
      {online && pending > 0 ? (
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing}
          className="rounded-sm border border-warning px-3 py-1 text-xs font-medium transition hover:bg-surface disabled:opacity-60"
        >
          {syncing ? "Menyinkronkan..." : "Sinkronkan sekarang"}
        </button>
      ) : null}
    </div>
  );
}
