import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getOfflineDb } from "./offlineDb";
import {
  MAX_AUTO_RETRIES,
  enqueueSale,
  getLocallyReservedQtyByVariant,
  getOutboxCounts,
  listFailed,
  listPending,
  listSyncable,
  markFailed,
  markSynced,
  markSyncing,
  resetForManualRetry,
} from "./outbox";

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("pendingSales");
}

describe("outbox.enqueueSale", () => {
  beforeEach(resetDb);

  it("returns a distinct clientSaleId per call and persists the sale as pending", async () => {
    const id1 = await enqueueSale({
      customerId: "c1",
      paymentMethod: "cash",
      lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }],
    });
    const id2 = await enqueueSale({
      customerId: "c1",
      paymentMethod: "cash",
      lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }],
    });

    expect(id1).not.toBe(id2);
    const pending = await listPending();
    expect(pending.map((p) => p.clientSaleId).sort()).toEqual([id1, id2].sort());
    expect(pending.every((p) => p.status === "pending")).toBe(true);
  });
});

describe("outbox status transitions", () => {
  beforeEach(resetDb);

  it("markSyncing/markSynced/markFailed update the row's status in place", async () => {
    const id = await enqueueSale({
      customerId: "c1",
      paymentMethod: "pix",
      lines: [{ variantId: "v1", quantity: 2, unitPrice: 20 }],
    });

    await markSyncing(id);
    let pending = await listPending();
    expect(pending.find((p) => p.clientSaleId === id)?.status).toBe("syncing");

    await markSynced(id, { orderId: "order-1", orderNumber: 42 });
    pending = await listPending();
    expect(pending.find((p) => p.clientSaleId === id)).toBeUndefined();

    const db = await getOfflineDb();
    const synced = await db.get("pendingSales", id);
    expect(synced?.status).toBe("synced");
    expect(synced?.orderNumber).toBe(42);
  });

  it("markFailed moves a sale out of listPending and into listFailed with the error message", async () => {
    const id = await enqueueSale({
      customerId: "c1",
      paymentMethod: "card",
      lines: [{ variantId: "v1", quantity: 1, unitPrice: 15 }],
    });

    await markFailed(id, "network down");

    expect(await listPending()).toEqual([]);
    const failed = await listFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].lastError).toBe("network down");
  });

  it("is a no-op when patching a clientSaleId that was never enqueued", async () => {
    await expect(markFailed("does-not-exist", "boom")).resolves.toBeUndefined();
  });
});

describe("outbox.getLocallyReservedQtyByVariant", () => {
  beforeEach(resetDb);

  it("sums quantities across pending sales for the same variant, ignoring backorder lines", async () => {
    await enqueueSale({
      customerId: "c1",
      paymentMethod: "cash",
      lines: [
        { variantId: "v1", quantity: 2, unitPrice: 10 },
        { variantId: "v2", quantity: 1, unitPrice: 5, isOrder: true },
      ],
    });
    await enqueueSale({
      customerId: "c2",
      paymentMethod: "cash",
      lines: [{ variantId: "v1", quantity: 3, unitPrice: 10 }],
    });

    const totals = await getLocallyReservedQtyByVariant();
    expect(totals).toEqual({ v1: 5 });
  });

  it("excludes sales already marked synced", async () => {
    const id = await enqueueSale({
      customerId: "c1",
      paymentMethod: "cash",
      lines: [{ variantId: "v1", quantity: 4, unitPrice: 10 }],
    });
    await markSynced(id, { orderId: "o1", orderNumber: 1 });

    const totals = await getLocallyReservedQtyByVariant();
    expect(totals.v1 ?? 0).toBe(0);
  });
});

describe("outbox.getOutboxCounts", () => {
  beforeEach(resetDb);

  it("counts each status independently and surfaces the most recent failure message", async () => {
    const id1 = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    const id2 = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await markSyncing(id1);
    await markFailed(id2, "sem conexão");

    const counts = await getOutboxCounts();
    expect(counts.pendingCount).toBe(0);
    expect(counts.syncingCount).toBe(1);
    expect(counts.failedCount).toBe(1);
    expect(counts.lastError).toBe("sem conexão");
  });
});

describe("outbox.markFailed — exponential backoff", () => {
  beforeEach(resetDb);

  it("increments retryCount and pushes nextRetryAt further out on each consecutive failure", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    const db = await getOfflineDb();

    await markFailed(id, "erro 1");
    const afterFirst = await db.get("pendingSales", id);
    expect(afterFirst?.retryCount).toBe(1);
    const firstDelay = new Date(afterFirst!.nextRetryAt!).getTime() - Date.now();

    await markFailed(id, "erro 2");
    const afterSecond = await db.get("pendingSales", id);
    expect(afterSecond?.retryCount).toBe(2);
    const secondDelay = new Date(afterSecond!.nextRetryAt!).getTime() - Date.now();

    expect(secondDelay).toBeGreaterThan(firstDelay);
  });

  it("clears retryCount/nextRetryAt once a sale finally succeeds", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await markFailed(id, "erro");
    await markSynced(id, { orderId: "o1", orderNumber: 1 });

    const db = await getOfflineDb();
    const row = await db.get("pendingSales", id);
    expect(row?.retryCount).toBeUndefined();
    expect(row?.nextRetryAt).toBeUndefined();
  });
});

describe("outbox.listSyncable / resetForManualRetry", () => {
  beforeEach(resetDb);

  it("includes pending and syncing sales unconditionally", async () => {
    const pendingId = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    const syncingId = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await markSyncing(syncingId);

    const syncable = await listSyncable();
    expect(syncable.map((s) => s.clientSaleId).sort()).toEqual([pendingId, syncingId].sort());
  });

  it("excludes a failed sale still inside its backoff window", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await markFailed(id, "erro"); // nextRetryAt is a few seconds in the future

    const syncable = await listSyncable();
    expect(syncable.map((s) => s.clientSaleId)).not.toContain(id);
  });

  it("includes a failed sale once its backoff window has passed", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await markFailed(id, "erro");
    const db = await getOfflineDb();
    const row = await db.get("pendingSales", id);
    // Simulate time having passed instead of a real sleep.
    await db.put("pendingSales", { ...row!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });

    const syncable = await listSyncable();
    expect(syncable.map((s) => s.clientSaleId)).toContain(id);
  });

  it("stops auto-retrying once MAX_AUTO_RETRIES is reached, even past the backoff window", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    const db = await getOfflineDb();
    for (let i = 0; i < MAX_AUTO_RETRIES; i++) {
      await markFailed(id, `erro ${i}`);
    }
    const row = await db.get("pendingSales", id);
    await db.put("pendingSales", { ...row!, nextRetryAt: new Date(Date.now() - 1000).toISOString() });

    const syncable = await listSyncable();
    expect(syncable.map((s) => s.clientSaleId)).not.toContain(id);
  });

  it("resetForManualRetry makes an exhausted failed sale syncable again immediately", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    for (let i = 0; i < MAX_AUTO_RETRIES; i++) {
      await markFailed(id, `erro ${i}`);
    }

    await resetForManualRetry(id);

    const syncable = await listSyncable();
    expect(syncable.map((s) => s.clientSaleId)).toContain(id);
  });
});
