import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getOfflineDb } from "./offlineDb";
import { enqueueSale } from "./outbox";
import {
  enqueueCustomer,
  isLocalCustomerId,
  listSyncableCustomers,
  markCustomerFailed,
  markCustomerSynced,
  repointPendingSalesCustomer,
} from "./customerOutbox";

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("pendingCustomers");
  await db.clear("pendingSales");
}

describe("customerOutbox.enqueueCustomer / isLocalCustomerId", () => {
  beforeEach(resetDb);

  it("returns a local: prefixed id and persists it as pending", async () => {
    const id = await enqueueCustomer("Maria");

    expect(isLocalCustomerId(id)).toBe(true);
    const db = await getOfflineDb();
    const row = await db.get("pendingCustomers", id);
    expect(row).toMatchObject({ name: "Maria", status: "pending" });
  });

  it("never confuses a real Mongo id for a local one", () => {
    expect(isLocalCustomerId("64f1a2b3c4d5e6f7a8b9c0d1")).toBe(false);
  });

  it("gives each call a distinct id, even for the same name", async () => {
    const a = await enqueueCustomer("Maria");
    const b = await enqueueCustomer("Maria");
    expect(a).not.toBe(b);
  });
});

describe("customerOutbox.listSyncableCustomers", () => {
  beforeEach(resetDb);

  it("includes both pending and previously-failed customers", async () => {
    const pendingId = await enqueueCustomer("Maria");
    const failedId = await enqueueCustomer("João");
    await markCustomerFailed(failedId, "boom");

    const syncable = await listSyncableCustomers();

    expect(syncable.map((c) => c.localId).sort()).toEqual([failedId, pendingId].sort());
  });

  it("excludes a customer that already synced", async () => {
    const id = await enqueueCustomer("Maria");
    await markCustomerSynced(id, "real-1");

    expect(await listSyncableCustomers()).toEqual([]);
  });
});

describe("customerOutbox.markCustomerSynced / markCustomerFailed", () => {
  beforeEach(resetDb);

  it("records the real id on success", async () => {
    const id = await enqueueCustomer("Maria");
    await markCustomerSynced(id, "real-cust-1");

    const db = await getOfflineDb();
    expect(await db.get("pendingCustomers", id)).toMatchObject({ status: "synced", realCustomerId: "real-cust-1" });
  });

  it("records the error on failure without discarding the row", async () => {
    const id = await enqueueCustomer("Maria");
    await markCustomerFailed(id, "network down");

    const db = await getOfflineDb();
    expect(await db.get("pendingCustomers", id)).toMatchObject({ status: "failed", lastError: "network down" });
  });
});

describe("customerOutbox.repointPendingSalesCustomer", () => {
  beforeEach(resetDb);

  it("rewrites every queued sale billed to the local id, leaving other sales untouched", async () => {
    const localId = await enqueueCustomer("Maria");
    const saleForMaria1 = await enqueueSale({ customerId: localId, paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    const saleForMaria2 = await enqueueSale({ customerId: localId, paymentMethod: "pix", lines: [{ variantId: "v2", quantity: 1, unitPrice: 20 }] });
    const saleForSomeoneElse = await enqueueSale({ customerId: "real-other-customer", paymentMethod: "cash", lines: [{ variantId: "v3", quantity: 1, unitPrice: 30 }] });

    await repointPendingSalesCustomer(localId, "real-cust-1");

    const db = await getOfflineDb();
    expect((await db.get("pendingSales", saleForMaria1))?.payload.customerId).toBe("real-cust-1");
    expect((await db.get("pendingSales", saleForMaria2))?.payload.customerId).toBe("real-cust-1");
    expect((await db.get("pendingSales", saleForSomeoneElse))?.payload.customerId).toBe("real-other-customer");
  });
});
