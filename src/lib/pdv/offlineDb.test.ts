import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getOfflineDb, type CatalogSnapshotRow, type PendingSaleRow } from "./offlineDb";

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("catalogSnapshot");
  await db.clear("pendingSales");
}

describe("offlineDb — catalogSnapshot store", () => {
  beforeEach(resetDb);

  const row: CatalogSnapshotRow = {
    variantId: "v1",
    productId: "p1",
    sku: "CAM-P",
    barcode: "789000111",
    productName: "Camiseta Básica",
    color: "Preta",
    size: "M",
    unitPrice: 59.9,
    quantity: 4,
  };

  it("stores and retrieves a row by its variantId key", async () => {
    const db = await getOfflineDb();
    await db.put("catalogSnapshot", row);

    const found = await db.get("catalogSnapshot", "v1");
    expect(found).toEqual(row);
  });

  it("looks a row up by its barcode index", async () => {
    const db = await getOfflineDb();
    await db.put("catalogSnapshot", row);

    const found = await db.getFromIndex("catalogSnapshot", "barcode", "789000111");
    expect(found?.variantId).toBe("v1");
  });

  it("returns undefined for a barcode that was never snapshotted", async () => {
    const db = await getOfflineDb();
    const found = await db.getFromIndex("catalogSnapshot", "barcode", "does-not-exist");
    expect(found).toBeUndefined();
  });
});

describe("offlineDb — pendingSales store", () => {
  beforeEach(resetDb);

  const sale: PendingSaleRow = {
    clientSaleId: "sale-1",
    payload: {
      customerId: "c1",
      paymentMethod: "cash",
      lines: [{ variantId: "v1", quantity: 1, unitPrice: 59.9 }],
    },
    status: "pending",
    createdAtLocal: new Date().toISOString(),
  };

  it("stores and retrieves a pending sale by clientSaleId", async () => {
    const db = await getOfflineDb();
    await db.put("pendingSales", sale);

    const found = await db.get("pendingSales", "sale-1");
    expect(found).toEqual(sale);
  });

  it("finds sales by status via the status index", async () => {
    const db = await getOfflineDb();
    await db.put("pendingSales", sale);
    await db.put("pendingSales", { ...sale, clientSaleId: "sale-2", status: "synced" });

    const pending = await db.getAllFromIndex("pendingSales", "status", "pending");
    expect(pending.map((s) => s.clientSaleId)).toEqual(["sale-1"]);
  });
});
