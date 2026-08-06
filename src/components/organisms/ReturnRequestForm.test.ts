import { describe, expect, it } from "vitest";
import { clampQty } from "./ReturnRequestForm";

describe("clampQty (Loop 8)", () => {
  it("keeps a value within [0, max]", () => {
    expect(clampQty(2, 5)).toBe(2);
  });

  it("clamps down to max when the typed value exceeds it", () => {
    expect(clampQty(10, 3)).toBe(3);
  });

  it("never goes negative", () => {
    expect(clampQty(-4, 5)).toBe(0);
  });

  it("clamps to 0 when max is 0 (nothing left to return)", () => {
    expect(clampQty(1, 0)).toBe(0);
  });
});
