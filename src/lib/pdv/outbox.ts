import { getOfflineDb, type PendingSalePayload, type PendingSaleRow } from "./offlineDb";

/** After this many failed attempts, the sync engine stops auto-retrying a sale and leaves it
 *  for the operator's own "Tentar novamente" — an endless silent retry loop would burn battery
 *  /data for a sale that's very likely stuck on something a person needs to notice. */
export const MAX_AUTO_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

/** UUID v4 via the Web Crypto API — no extra dependency needed for a client-generated
 *  idempotency key (`clientSaleId`, deduped server-side once Loop 4's sync endpoint exists). */
function newClientSaleId(): string {
  return crypto.randomUUID();
}

/** Queues a sale locally (online or offline — the caller doesn't need to know which) and
 *  returns its `clientSaleId` immediately, before any network call happens. */
export async function enqueueSale(payload: PendingSalePayload): Promise<string> {
  const clientSaleId = newClientSaleId();
  const row: PendingSaleRow = {
    clientSaleId,
    payload,
    status: "pending",
    createdAtLocal: new Date().toISOString(),
  };
  const db = await getOfflineDb();
  await db.put("pendingSales", row);
  return clientSaleId;
}

export async function listPending(): Promise<PendingSaleRow[]> {
  const db = await getOfflineDb();
  const [pending, syncing] = await Promise.all([
    db.getAllFromIndex("pendingSales", "status", "pending"),
    db.getAllFromIndex("pendingSales", "status", "syncing"),
  ]);
  return [...pending, ...syncing];
}

export async function listFailed(): Promise<PendingSaleRow[]> {
  const db = await getOfflineDb();
  return db.getAllFromIndex("pendingSales", "status", "failed");
}

/** Counts by status, for a status badge — separate from `listPending()` (which merges
 *  pending+syncing for the reservation math) since the UI wants to tell them apart. */
export async function getOutboxCounts(): Promise<{
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  lastError?: string;
}> {
  const db = await getOfflineDb();
  const [pending, syncing, failed] = await Promise.all([
    db.getAllFromIndex("pendingSales", "status", "pending"),
    db.getAllFromIndex("pendingSales", "status", "syncing"),
    db.getAllFromIndex("pendingSales", "status", "failed"),
  ]);
  return {
    pendingCount: pending.length,
    syncingCount: syncing.length,
    failedCount: failed.length,
    lastError: failed.at(-1)?.lastError,
  };
}

/** Everything the sync engine should attempt right now: pending/syncing sales, plus failed
 *  ones whose backoff window has passed and haven't exhausted their auto-retry budget. */
export async function listSyncable(): Promise<PendingSaleRow[]> {
  const [pending, failed] = await Promise.all([listPending(), listFailed()]);
  const now = Date.now();
  const retryableFailed = failed.filter((s) => {
    if ((s.retryCount ?? 0) >= MAX_AUTO_RETRIES) return false;
    if (!s.nextRetryAt) return true;
    return new Date(s.nextRetryAt).getTime() <= now;
  });
  return [...pending, ...retryableFailed];
}

export async function markSyncing(clientSaleId: string): Promise<void> {
  await patch(clientSaleId, { status: "syncing" });
}

export async function markSynced(
  clientSaleId: string,
  result: { orderId: string; orderNumber: number; partialBackorder?: boolean },
): Promise<void> {
  await patch(clientSaleId, {
    status: "synced",
    lastError: undefined,
    retryCount: undefined,
    nextRetryAt: undefined,
    ...result,
  });
}

export async function markFailed(clientSaleId: string, error: string): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get("pendingSales", clientSaleId);
  if (!existing) return;
  const retryCount = (existing.retryCount ?? 0) + 1;
  const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1), MAX_RETRY_DELAY_MS);
  await patch(clientSaleId, {
    status: "failed",
    lastError: error,
    retryCount,
    nextRetryAt: new Date(Date.now() + delay).toISOString(),
  });
}

/** Manual "Tentar novamente" resets the auto-retry budget — an operator's explicit action
 *  should always get an immediate attempt, not be blocked by an earlier backoff window. */
export async function resetForManualRetry(clientSaleId: string): Promise<void> {
  await patch(clientSaleId, { status: "pending", retryCount: 0, nextRetryAt: undefined, lastError: undefined });
}

async function patch(clientSaleId: string, changes: Partial<PendingSaleRow>): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get("pendingSales", clientSaleId);
  if (!existing) return;
  await db.put("pendingSales", { ...existing, ...changes });
}

/** Sum of quantities for a variant across every sale still sitting in the outbox
 *  (pending or mid-sync) — the live, correct-by-construction replacement for the old
 *  `usePdvStore.localReserved` counter, which nothing ever kept in sync. */
export async function getLocallyReservedQtyByVariant(): Promise<Record<string, number>> {
  const pending = await listPending();
  const totals: Record<string, number> = {};
  for (const sale of pending) {
    for (const line of sale.payload.lines) {
      if (line.isOrder) continue; // backorder lines don't draw down real stock
      totals[line.variantId] = (totals[line.variantId] ?? 0) + line.quantity;
    }
  }
  return totals;
}
