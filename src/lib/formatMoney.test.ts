import { describe, expect, it } from "vitest";
import { formatBRL, parseBRLToNumber } from "./formatMoney";

describe("formatBRL", () => {
  it("formats BRL in pt-BR", () => {
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
  });
});

describe("parseBRLToNumber", () => {
  it("passes a plain number through unchanged", () => {
    expect(parseBRLToNumber(45.9)).toBe(45.9);
  });

  // Regression: the API's global BrlMoneyResponseInterceptor turns fields like
  // unitPrice/priceRetail/total into pt-BR strings ("45,90", "1.234,56"). Code that did
  // plain Number(val) on these got NaN and silently blanked the value in the UI (hit in
  // the purchase editor: saved unit prices never showed up when re-opening a purchase).
  it("parses a pt-BR formatted string from the API", () => {
    expect(parseBRLToNumber("45,90")).toBe(45.9);
    expect(parseBRLToNumber("1.234,56")).toBe(1234.56);
  });

  it("falls back to 0 for null/undefined/empty/unparseable input", () => {
    expect(parseBRLToNumber(null)).toBe(0);
    expect(parseBRLToNumber(undefined)).toBe(0);
    expect(parseBRLToNumber("")).toBe(0);
    expect(parseBRLToNumber("garbage")).toBe(0);
  });
});
