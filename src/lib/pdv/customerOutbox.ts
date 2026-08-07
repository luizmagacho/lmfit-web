import { getOfflineDb, type PendingCustomerRow } from "./offlineDb";

/** Marks a cart customer id as one typed offline and not yet real — `syncEngine` resolves it
 *  (creates the customer server-side, repoints any queued sales) as soon as it can reach the
 *  API. Distinct from a real Mongo id, which is never namespaced like this. */
export const LOCAL_CUSTOMER_PREFIX = "local:";

export function isLocalCustomerId(id: string): boolean {
  return id.startsWith(LOCAL_CUSTOMER_PREFIX);
}

function newLocalCustomerId(): string {
  return `${LOCAL_CUSTOMER_PREFIX}${crypto.randomUUID()}`;
}

/** Queues a customer name locally and returns its temporary id immediately — same shape as
 *  `outbox.enqueueSale`, so the counter never has to wait on a network call to keep moving. */
export async function enqueueCustomer(name: string): Promise<string> {
  const localId = newLocalCustomerId();
  const row: PendingCustomerRow = {
    localId,
    name,
    status: "pending",
    createdAtLocal: new Date().toISOString(),
  };
  const db = await getOfflineDb();
  await db.put("pendingCustomers", row);
  return localId;
}

/** Everything `syncEngine` should try to create server-side right now — pending ones plus any
 *  that failed a previous attempt (no backoff here: creating a customer is a single lightweight
 *  call, and this only ever runs after `probeOnline()` already confirmed reachability). */
export async function listSyncableCustomers(): Promise<PendingCustomerRow[]> {
  const db = await getOfflineDb();
  const [pending, failed] = await Promise.all([
    db.getAllFromIndex("pendingCustomers", "status", "pending"),
    db.getAllFromIndex("pendingCustomers", "status", "failed"),
  ]);
  return [...pending, ...failed];
}

export async function markCustomerSynced(localId: string, realCustomerId: string): Promise<void> {
  await patch(localId, { status: "synced", realCustomerId, lastError: undefined });
}

export async function markCustomerFailed(localId: string, error: string): Promise<void> {
  await patch(localId, { status: "failed", lastError: error });
}

async function patch(localId: string, changes: Partial<PendingCustomerRow>): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get("pendingCustomers", localId);
  if (!existing) return;
  await db.put("pendingCustomers", { ...existing, ...changes });
}

/** Rewrites every queued sale still billed to a local customer id once that customer has a
 *  real one — without this, a sale created before its walk-in-named customer finished syncing
 *  would try to bill an id the server has never heard of. */
export async function repointPendingSalesCustomer(localId: string, realCustomerId: string): Promise<void> {
  const db = await getOfflineDb();
  const all = await db.getAll("pendingSales");
  const toUpdate = all.filter((s) => s.payload.customerId === localId);
  await Promise.all(
    toUpdate.map((s) => db.put("pendingSales", { ...s, payload: { ...s.payload, customerId: realCustomerId } })),
  );
}
