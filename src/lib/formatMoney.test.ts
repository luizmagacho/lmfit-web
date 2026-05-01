import { describe, expect, it } from "vitest";
import { formatBRL } from "./formatMoney";

describe("formatBRL", () => {
  it("formats BRL in pt-BR", () => {
    expect(formatBRL(1234.5)).toMatch(/1\.234,50/);
  });
});
