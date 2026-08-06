import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getOfflineDb } from "./offlineDb";
import { listRecentSyncHistory, recordSyncHistoryEntry } from "./syncHistory";

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("syncHistory");
}

describe("syncHistory", () => {
  beforeEach(resetDb);

  it("persists an entry and lists it back, most recent first", async () => {
    await recordSyncHistoryEntry({ clientSaleId: "s1", orderId: "o1", orderNumber: 1 });
    await recordSyncHistoryEntry({ clientSaleId: "s2", orderId: "o2", orderNumber: 2 });

    const history = await listRecentSyncHistory();

    expect(history.map((h) => h.clientSaleId)).toEqual(["s2", "s1"]);
  });

  it("survives a reload — reads straight from IndexedDB, not memory", async () => {
    await recordSyncHistoryEntry({
      clientSaleId: "s1",
      orderId: "o1",
      orderNumber: 1,
      downgradedLines: [{ variantId: "v1", requested: 3, fulfilled: 2 }],
    });

    // Simulate "reload" by re-opening a fresh read against the same underlying DB.
    const db = await getOfflineDb();
    const row = await db.get("syncHistory", "s1");

    expect(row?.downgradedLines).toEqual([{ variantId: "v1", requested: 3, fulfilled: 2 }]);
  });

  it("overwrites rather than duplicates when the same clientSaleId is recorded again (replay)", async () => {
    await recordSyncHistoryEntry({ clientSaleId: "s1", orderId: "o1", orderNumber: 1 });
    await recordSyncHistoryEntry({ clientSaleId: "s1", orderId: "o1", orderNumber: 1 });

    const history = await listRecentSyncHistory();

    expect(history).toHaveLength(1);
  });

  it("prunes down to the most recent 50 entries instead of growing unbounded", async () => {
    for (let i = 0; i < 55; i++) {
      await recordSyncHistoryEntry({ clientSaleId: `s${i}`, orderId: `o${i}`, orderNumber: i });
    }

    const db = await getOfflineDb();
    const all = await db.getAll("syncHistory");

    expect(all).toHaveLength(50);
    // The oldest 5 (s0..s4) should have been pruned; the newest should remain.
    expect(all.map((e) => e.clientSaleId)).not.toContain("s0");
    expect(all.map((e) => e.clientSaleId)).toContain("s54");
  });

  it("respects the limit parameter and defaults to a reasonable page size", async () => {
    for (let i = 0; i < 10; i++) {
      await recordSyncHistoryEntry({ clientSaleId: `s${i}`, orderId: `o${i}`, orderNumber: i });
    }

    const history = await listRecentSyncHistory(3);

    expect(history).toHaveLength(3);
    expect(history[0].clientSaleId).toBe("s9");
  });
});
