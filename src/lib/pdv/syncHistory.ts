import { getOfflineDb, type SyncHistoryEntry } from "./offlineDb";

const MAX_HISTORY_ENTRIES = 50;

/** Persists one auto-backorder sync event, keyed by `clientSaleId` so a replayed sync
 *  result overwrites rather than duplicates. Prunes down to the most recent
 *  `MAX_HISTORY_ENTRIES` afterwards so the store never grows unbounded on a terminal
 *  that's rarely restarted. */
export async function recordSyncHistoryEntry(
  entry: Omit<SyncHistoryEntry, "id" | "occurredAt">,
): Promise<void> {
  const db = await getOfflineDb();
  const occurredAt = new Date().toISOString();
  await db.put("syncHistory", { ...entry, id: entry.clientSaleId, occurredAt });

  const all = await db.getAllFromIndex("syncHistory", "occurredAt");
  const excess = all.length - MAX_HISTORY_ENTRIES;
  if (excess > 0) {
    await Promise.all(all.slice(0, excess).map((e) => db.delete("syncHistory", e.id)));
  }
}

/** Most recent entries first — survives a page reload since it reads straight from
 *  IndexedDB, not from any in-memory/React state. */
export async function listRecentSyncHistory(limit = 20): Promise<SyncHistoryEntry[]> {
  const db = await getOfflineDb();
  const all = await db.getAllFromIndex("syncHistory", "occurredAt");
  return all.slice(-limit).reverse();
}
