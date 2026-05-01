import { describe, expect, it } from "vitest";
import { slugifyFileBase } from "./slugifyFileBase";

describe("slugifyFileBase", () => {
  it("normalizes title", () => {
    expect(slugifyFileBase("Notas fiscais")).toBe("notas-fiscais");
    expect(slugifyFileBase("  LM  ")).toBe("lm");
  });
});
