import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http", () => ({
  http: { get: vi.fn(), post: vi.fn() },
}));

import { http } from "@/lib/http";
import { getOfflineDb } from "./offlineDb";
import {
  getCachedWalkInCustomer,
  listAllLocal,
  listAllLocalAsProducts,
  lookupLocalByBarcode,
  refreshSnapshot,
  refreshWalkInCustomer,
  searchLocal,
} from "./catalogSnapshot";

const httpGet = http.get as ReturnType<typeof vi.fn>;
const httpPost = http.post as ReturnType<typeof vi.fn>;

async function resetDb() {
  const db = await getOfflineDb();
  await db.clear("catalogSnapshot");
}

describe("refreshSnapshot", () => {
  beforeEach(async () => {
    await resetDb();
    httpGet.mockReset();
  });

  // Regression (caught live, not by any mock): the API's PaginationQueryDto rejects any
  // `limit` above 1000 with a 422 — this call used to send 2000 and broke every real
  // refreshSnapshot() until it was caught during Loop 5's browser verification.
  it("never requests a limit above what the API's pagination DTO accepts (max 1000)", async () => {
    httpGet.mockImplementation((url: string) => {
      if (url.includes("/stock")) return Promise.resolve({ data: { items: [] } });
      return Promise.resolve({ data: { items: [] } });
    });

    await refreshSnapshot("loc1");

    for (const call of httpGet.mock.calls) {
      const params = call[1]?.params;
      if (params?.limit !== undefined) {
        expect(params.limit).toBeLessThanOrEqual(1000);
      }
    }
  });

  // Regression (caught live, not by any mock): the real API serializes money fields as
  // pt-BR formatted strings ("39,90"), not raw numbers. A plain `Number("39,90")` is `NaN`
  // (the comma breaks it) — every snapshot price silently became R$0,00 until this was
  // caught in Loop 5's browser verification. The other tests in this file use a plain
  // number for `price`, which is exactly why they never caught it.
  it("parses a pt-BR formatted money string price instead of silently turning it into 0", async () => {
    httpGet.mockImplementation((url: string) => {
      if (url.includes("/stock")) {
        return Promise.resolve({ data: { items: [{ variantId: "v1", sku: "CAM-P", productName: "Camiseta", quantity: 3 }] } });
      }
      return Promise.resolve({
        data: {
          items: [
            { _id: "p1", name: "Camiseta", priceRetail: "49,90", variants: [{ _id: "v1", sku: "CAM-P", price: "49,90" }] },
          ],
        },
      });
    });

    await refreshSnapshot("loc1");

    const db = await getOfflineDb();
    const row = await db.get("catalogSnapshot", "v1");
    expect(row?.unitPrice).toBe(49.9);
  });

  it("keeps only variants the location actually has allocated, merged with product details", async () => {
    httpGet.mockImplementation((url: string) => {
      if (url.includes("/stock")) {
        return Promise.resolve({
          data: {
            items: [{ variantId: "v1", sku: "CAM-P", productName: "Camiseta", quantity: 3 }],
          },
        });
      }
      return Promise.resolve({
        data: {
          items: [
            {
              _id: "p1",
              name: "Camiseta",
              priceRetail: 49.9,
              variants: [
                { _id: "v1", sku: "CAM-P", color: "Preta", size: "M", price: 49.9, barcode: "123" },
                { _id: "v2", sku: "CAM-B", color: "Branca", size: "M", price: 49.9 },
              ],
            },
          ],
        },
      });
    });

    await refreshSnapshot("loc1");

    const db = await getOfflineDb();
    const rows = await db.getAll("catalogSnapshot");
    // v2 has no allocation at this location (absent from the stock response) — must not
    // leak into the offline snapshot as sellable.
    expect(rows.map((r) => r.variantId)).toEqual(["v1"]);
    expect(rows[0]).toMatchObject({ sku: "CAM-P", quantity: 3, barcode: "123", unitPrice: 49.9 });
  });

  it("replaces the whole snapshot instead of merging with the previous one", async () => {
    httpGet.mockImplementation((url: string) => {
      if (url.includes("/stock")) {
        return Promise.resolve({ data: { items: [{ variantId: "v1", sku: "A", productName: "A", quantity: 1 }] } });
      }
      return Promise.resolve({
        data: { items: [{ _id: "p1", name: "A", variants: [{ _id: "v1", sku: "A", price: 10 }] }] },
      });
    });
    await refreshSnapshot("loc1");

    // Second refresh: v1 lost its allocation entirely (location reassigned elsewhere).
    httpGet.mockImplementation((url: string) => {
      if (url.includes("/stock")) return Promise.resolve({ data: { items: [] } });
      return Promise.resolve({
        data: { items: [{ _id: "p1", name: "A", variants: [{ _id: "v1", sku: "A", price: 10 }] }] },
      });
    });
    await refreshSnapshot("loc1");

    const db = await getOfflineDb();
    expect(await db.getAll("catalogSnapshot")).toEqual([]);
  });
});

describe("searchLocal", () => {
  beforeEach(async () => {
    await resetDb();
    const db = await getOfflineDb();
    await db.put("catalogSnapshot", {
      variantId: "v1",
      productId: "p1",
      sku: "CAM-PRETA-M",
      productName: "Camiseta Dry Fit",
      color: "Preta",
      size: "M",
      unitPrice: 49.9,
      quantity: 5,
    });
  });

  it("matches by product name, case-insensitively", async () => {
    const out = await searchLocal("dry fit");
    expect(out.map((r) => r.variantId)).toEqual(["v1"]);
  });

  it("matches by SKU substring", async () => {
    const out = await searchLocal("preta-m");
    expect(out).toHaveLength(1);
  });

  it("returns nothing for a term with no match", async () => {
    const out = await searchLocal("bermuda");
    expect(out).toEqual([]);
  });

  it("returns nothing for an empty/blank term", async () => {
    expect(await searchLocal("   ")).toEqual([]);
  });
});

describe("listAllLocal / listAllLocalAsProducts (PDV default browsable list)", () => {
  beforeEach(async () => {
    await resetDb();
    const db = await getOfflineDb();
    await db.put("catalogSnapshot", {
      variantId: "v1", productId: "p1", sku: "CAM-P", productName: "Camiseta Dry Fit",
      color: "Preta", size: "M", unitPrice: 49.9, quantity: 5,
    });
    await db.put("catalogSnapshot", {
      variantId: "v2", productId: "p1", sku: "CAM-B", productName: "Camiseta Dry Fit",
      color: "Branca", size: "M", unitPrice: 49.9, quantity: 3,
    });
    await db.put("catalogSnapshot", {
      variantId: "v3", productId: "p2", sku: "BER-P", productName: "Bermuda",
      color: "Preta", size: "G", unitPrice: 89.9, quantity: 2,
    });
  });

  it("returns every row currently in the snapshot, without needing a search term", async () => {
    const rows = await listAllLocal();
    expect(rows).toHaveLength(3);
  });

  it("sorts alphabetically by product name — a predictable order to scroll through", async () => {
    const rows = await listAllLocal();
    expect(rows.map((r) => r.productName)).toEqual(["Bermuda", "Camiseta Dry Fit", "Camiseta Dry Fit"]);
  });

  it("groups variants of the same product together as one browsable item", async () => {
    const products = await listAllLocalAsProducts();
    expect(products).toHaveLength(2);
    const camiseta = products.find((p) => p.name === "Camiseta Dry Fit") as { variants: unknown[] };
    expect(camiseta.variants).toHaveLength(2);
  });

  it("returns an empty list rather than throwing when the snapshot was never warmed", async () => {
    await resetDb();
    expect(await listAllLocal()).toEqual([]);
    expect(await listAllLocalAsProducts()).toEqual([]);
  });
});

describe("lookupLocalByBarcode", () => {
  beforeEach(async () => {
    await resetDb();
    const db = await getOfflineDb();
    await db.put("catalogSnapshot", {
      variantId: "v1",
      productId: "p1",
      sku: "CAM-P",
      barcode: "7891234567890",
      productName: "Camiseta",
      unitPrice: 49.9,
      quantity: 2,
    });
  });

  it("finds the exact variant by barcode", async () => {
    const found = await lookupLocalByBarcode("7891234567890");
    expect(found?.variantId).toBe("v1");
  });

  it("returns null for an unknown barcode instead of throwing", async () => {
    expect(await lookupLocalByBarcode("0000000000000")).toBeNull();
  });
});

describe("refreshWalkInCustomer / getCachedWalkInCustomer (offline checkout regression)", () => {
  beforeEach(async () => {
    const db = await getOfflineDb();
    await db.clear("meta");
    httpPost.mockReset();
  });

  it("caches the walk-in customer id/name locally after a successful fetch", async () => {
    httpPost.mockResolvedValue({ data: { _id: "cust-final-1", name: "Consumidor Final" } });

    await refreshWalkInCustomer();

    expect(await getCachedWalkInCustomer()).toEqual({ id: "cust-final-1", name: "Consumidor Final" });
  });

  it("returns null when nothing was ever cached — e.g. the PDV's very first open happened offline", async () => {
    expect(await getCachedWalkInCustomer()).toBeNull();
  });

  it("does not cache a response with no usable id", async () => {
    httpPost.mockResolvedValue({ data: {} });

    await refreshWalkInCustomer();

    expect(await getCachedWalkInCustomer()).toBeNull();
  });
});
