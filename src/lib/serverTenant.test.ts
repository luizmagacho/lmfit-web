import { describe, expect, it } from "vitest";
import { extractServerPrice, resolveTenantSlugFromHost, serverProductInStock } from "./serverTenant";
import type { ServerProduct } from "./serverTenant";

describe("resolveTenantSlugFromHost (Loop 10 v2)", () => {
  it("dev local: extracts the subdomain from '<slug>.localhost:PORT'", () => {
    expect(resolveTenantSlugFromHost("lmfit.localhost:3000")).toBe("lmfit");
    expect(resolveTenantSlugFromHost("kivoni.localhost:3000")).toBe("kivoni");
    expect(resolveTenantSlugFromHost("lmfit.localhost")).toBe("lmfit");
  });

  it("bare 'localhost' (no subdomain) resolves to no slug", () => {
    expect(resolveTenantSlugFromHost("localhost:3000")).toBe("");
    expect(resolveTenantSlugFromHost("localhost")).toBe("");
  });

  it("production: extracts the subdomain from '<slug>.kivoni.com.br', excludes www/admin", () => {
    expect(resolveTenantSlugFromHost("loja.kivoni.com.br")).toBe("loja");
    expect(resolveTenantSlugFromHost("www.kivoni.com.br")).toBe("");
    expect(resolveTenantSlugFromHost("admin.kivoni.com.br")).toBe("");
  });

  it("legacy LMFit domain always resolves to 'lmfit'", () => {
    expect(resolveTenantSlugFromHost("crm.lmfit.com.br")).toBe("lmfit");
    expect(resolveTenantSlugFromHost("www.lmfit.com.br")).toBe("lmfit");
    expect(resolveTenantSlugFromHost("lmfit.com.br")).toBe("lmfit");
  });

  it("unrecognized host returns empty string (caller decides the fallback)", () => {
    expect(resolveTenantSlugFromHost("example.com")).toBe("");
    expect(resolveTenantSlugFromHost("")).toBe("");
  });
});

describe("extractServerPrice (Loop 10 v2 — mesmo parser de ProductGrid.tsx, duplicado pro server)", () => {
  it("parses a BrlMoneyResponseInterceptor-formatted string", () => {
    expect(extractServerPrice("299,90")).toBeCloseTo(299.9);
    expect(extractServerPrice("1.234,56")).toBeCloseTo(1234.56);
  });

  it("passes a plain number through unchanged", () => {
    expect(extractServerPrice(299.9)).toBe(299.9);
  });

  it("falls back to 0 for unparseable input", () => {
    expect(extractServerPrice(undefined)).toBe(0);
    expect(extractServerPrice(null)).toBe(0);
    expect(extractServerPrice("not a price")).toBe(0);
  });
});

describe("serverProductInStock (Loop 10 v2 — availability pro Product JSON-LD)", () => {
  it("true when any variant has stock", () => {
    const p = { variants: [{ quantityInStock: 0 }, { quantityInStock: 5 }] } as ServerProduct;
    expect(serverProductInStock(p)).toBe(true);
  });

  it("false when every variant is out of stock", () => {
    const p = { variants: [{ quantityInStock: 0 }, { quantityOnHand: 0 }] } as ServerProduct;
    expect(serverProductInStock(p)).toBe(false);
  });

  it("prefers quantityOnHand over quantityInStock when both are present", () => {
    const p = { variants: [{ quantityOnHand: 3, quantityInStock: 0 }] } as ServerProduct;
    expect(serverProductInStock(p)).toBe(true);
  });

  it("defaults to true when there are no variants (informational-only, not a hard stock gate)", () => {
    const p = { variants: [] } as unknown as ServerProduct;
    expect(serverProductInStock(p)).toBe(true);
  });
});
