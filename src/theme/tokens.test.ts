import { describe, expect, it } from "vitest";
import { lmfitTokens } from "./tokens";

describe("lmfitTokens", () => {
  it("exposes primary brand color", () => {
    expect(lmfitTokens.primary).toMatch(/^#/);
    expect(lmfitTokens.primary.length).toBeGreaterThanOrEqual(4);
  });
});
