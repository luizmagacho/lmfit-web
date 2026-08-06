import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import { toast } from "react-hot-toast";
import { http } from "@/lib/http";
import { getOfflineDb } from "./offlineDb";
import { enqueueSale, getOutboxCounts, listFailed } from "./outbox";
import { listRecentSyncHistory } from "./syncHistory";
import { flushNow, retryFailedNow } from "./syncEngine";

const httpGet = http.get as ReturnType<typeof vi.fn>;
const httpPost = http.post as ReturnType<typeof vi.fn>;

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("pendingSales");
  await db.clear("syncHistory");
}

describe("syncEngine.flushNow", () => {
  beforeEach(async () => {
    await resetDb();
    httpGet.mockReset();
    httpPost.mockReset();
    httpGet.mockResolvedValue({ data: { ok: true } }); // /health probe
    (toast as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it("does nothing when there is nothing queued (no network call at all)", async () => {
    await flushNow();
    expect(httpPost).not.toHaveBeenCalled();
  });

  it("does not attempt a batch when the health probe fails (looks offline)", async () => {
    httpGet.mockRejectedValue(new Error("network down"));
    await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });

    await flushNow();

    expect(httpPost).not.toHaveBeenCalled();
    const counts = await getOutboxCounts();
    expect(counts.pendingCount).toBe(1); // still queued, untouched
  });

  it("marks a sale synced on a successful batch response", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    httpPost.mockResolvedValue({
      data: [{ clientSaleId: id, orderId: "order-1", orderNumber: 5, status: "ok" }],
    });

    await flushNow();

    const counts = await getOutboxCounts();
    expect(counts).toMatchObject({ pendingCount: 0, syncingCount: 0, failedCount: 0 });
    const db = await getOfflineDb();
    const row = await db.get("pendingSales", id);
    expect(row?.status).toBe("synced");
    expect(row?.orderNumber).toBe(5);
  });

  it("records partialBackorder on a sale the server auto-downgraded", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 3, unitPrice: 10 }] });
    httpPost.mockResolvedValue({
      data: [{ clientSaleId: id, orderId: "order-1", orderNumber: 5, status: "partial_backorder" }],
    });

    await flushNow();

    const db = await getOfflineDb();
    const row = await db.get("pendingSales", id);
    expect(row?.partialBackorder).toBe(true);
  });

  it("persists a sync history entry for a partial_backorder result, surviving past this in-memory flush", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 3, unitPrice: 10 }] });
    httpPost.mockResolvedValue({
      data: [{
        clientSaleId: id,
        orderId: "order-1",
        orderNumber: 5,
        status: "partial_backorder",
        downgradedLines: [{ variantId: "v1", requested: 3, fulfilled: 2 }],
      }],
    });

    await flushNow();

    const history = await listRecentSyncHistory();
    expect(history).toEqual([
      expect.objectContaining({
        clientSaleId: id,
        orderId: "order-1",
        orderNumber: 5,
        downgradedLines: [{ variantId: "v1", requested: 3, fulfilled: 2 }],
      }),
    ]);
  });

  it("does not write a history entry for a sale that synced with no conflict", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    httpPost.mockResolvedValue({ data: [{ clientSaleId: id, orderId: "order-1", orderNumber: 5, status: "ok" }] });

    await flushNow();

    expect(await listRecentSyncHistory()).toEqual([]);
  });

  it("shows a toast for a partial_backorder result while the app is in the foreground", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 3, unitPrice: 10 }] });
    httpPost.mockResolvedValue({
      data: [{ clientSaleId: id, orderId: "order-1", orderNumber: 5, status: "partial_backorder" }],
    });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

    await flushNow();

    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("skips the toast (history is still recorded) when the app is backgrounded", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 3, unitPrice: 10 }] });
    httpPost.mockResolvedValue({
      data: [{ clientSaleId: id, orderId: "order-1", orderNumber: 5, status: "partial_backorder" }],
    });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

    await flushNow();

    expect(toast).not.toHaveBeenCalled();
    expect(await listRecentSyncHistory()).toHaveLength(1);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("marks every queued sale failed when the whole batch request rejects, without losing them", async () => {
    await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    await enqueueSale({ customerId: "c2", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    httpPost.mockRejectedValue(new Error("500"));

    await flushNow();

    const failed = await listFailed();
    expect(failed).toHaveLength(2);
  });

  it("marks a sale failed if the server's response never mentions it", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    httpPost.mockResolvedValue({ data: [] });

    await flushNow();

    const failed = await listFailed();
    expect(failed.map((s) => s.clientSaleId)).toContain(id);
  });

  it("re-entrant calls while already flushing are no-ops (never sends the batch twice)", async () => {
    await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    let resolvePost!: (v: unknown) => void;
    httpPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));

    const first = flushNow();
    const second = flushNow(); // fires while the first is still awaiting the network
    resolvePost({ data: [] });
    await Promise.all([first, second]);

    expect(httpPost).toHaveBeenCalledTimes(1);
  });
});

describe("syncEngine.retryFailedNow", () => {
  beforeEach(async () => {
    await resetDb();
    httpGet.mockReset();
    httpPost.mockReset();
    httpGet.mockResolvedValue({ data: { ok: true } });
  });

  it("resets a failed sale's backoff and flushes it immediately", async () => {
    const id = await enqueueSale({ customerId: "c1", paymentMethod: "cash", lines: [{ variantId: "v1", quantity: 1, unitPrice: 10 }] });
    httpPost.mockRejectedValueOnce(new Error("boom"));
    await flushNow(); // first attempt fails, sale is now in backoff

    httpPost.mockResolvedValue({ data: [{ clientSaleId: id, orderId: "o1", orderNumber: 1, status: "ok" }] });
    await retryFailedNow();

    const db = await getOfflineDb();
    const row = await db.get("pendingSales", id);
    expect(row?.status).toBe("synced");
  });
});
