export type QueuedTransaction = {
  idempotencyKey: string;
  payload: Record<string, unknown>;
  queuedAt: string;
};

const STORAGE_KEY = "rifintrack.offline.transactions.v1";
const CHANGE_EVENT = "rifintrack:queue-change";

function readQueue(): QueuedTransaction[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is QueuedTransaction =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as QueuedTransaction).idempotencyKey === "string" &&
        typeof (item as QueuedTransaction).payload === "object" &&
        (item as QueuedTransaction).payload !== null,
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedTransaction[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getQueuedTransactions() {
  return readQueue();
}

export function countQueuedTransactions() {
  return readQueue().length;
}

export function enqueueTransaction(payload: Record<string, unknown>) {
  const queue = readQueue();
  const idempotencyKey =
    typeof payload.idempotencyKey === "string"
      ? payload.idempotencyKey
      : createIdempotencyKey();

  if (queue.some((item) => item.idempotencyKey === idempotencyKey)) {
    return idempotencyKey;
  }

  queue.push({
    idempotencyKey,
    payload: { ...payload, idempotencyKey },
    queuedAt: new Date().toISOString(),
  });
  writeQueue(queue);

  return idempotencyKey;
}

export async function flushQueuedTransactions() {
  const queue = readQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  let synced = 0;
  const remaining: QueuedTransaction[] = [];

  for (const item of queue) {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        synced += 1;
        continue;
      }

      if (response.status === 401 || response.status === 429) {
        remaining.push(item);
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        synced += 1;
        continue;
      }

      remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);

  return { synced, remaining: remaining.length };
}
