import { describe, expect, it } from "vitest";
import {
  getStockConflictsFromAxiosError,
  parseNestMessage,
  parseStockConflictsFromBody,
} from "./apiErrors";

describe("parseNestMessage", () => {
  it("reads string message", () => {
    expect(parseNestMessage({ message: "  hello  " })).toBe("hello");
  });

  it("joins array message", () => {
    expect(parseNestMessage({ message: ["a", "b"] })).toBe("a, b");
  });

  it("returns empty for missing", () => {
    expect(parseNestMessage({})).toBe("");
  });
});

describe("parseStockConflictsFromBody", () => {
  it("returns undefined when conflicts missing", () => {
    expect(parseStockConflictsFromBody({ message: "x" })).toBeUndefined();
  });

  it("parses valid conflicts", () => {
    const c = parseStockConflictsFromBody({
      conflicts: [
        {
          variantId: "v1",
          sku: "SKU",
          needed: 5,
          available: 1,
          messagePtBr: "Falta",
        },
      ],
    });
    expect(c).toHaveLength(1);
    expect(c?.[0].sku).toBe("SKU");
  });
});

describe("getStockConflictsFromAxiosError", () => {
  it("extracts 422 payload", () => {
    const err = Object.assign(new Error("fail"), {
      isAxiosError: true as const,
      response: {
        status: 422,
        data: {
          message: "Estoque insuficiente",
          conflicts: [
            {
              variantId: "v1",
              sku: "SKU-LOW",
              needed: 5,
              available: 1,
              messagePtBr: "Detalhe",
            },
          ],
        },
      },
    });
    const parsed = getStockConflictsFromAxiosError(err);
    expect(parsed?.message).toContain("Estoque");
    expect(parsed?.conflicts).toHaveLength(1);
    expect(parsed?.conflicts?.[0].sku).toBe("SKU-LOW");
  });

  it("returns null when not axios shape", () => {
    expect(getStockConflictsFromAxiosError(new Error("x"))).toBeNull();
  });
});
