import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbookToItems } from "./excelIo";

describe("excelIo", () => {
  it("parseWorkbookToItems maps headers by label", () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "E-mail"],
      ["Ana", "ana@example.com"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S1");
    const raw = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayLike<number>);
    const items = parseWorkbookToItems(u8, [
      { key: "name", label: "Nome" },
      { key: "email", label: "E-mail" },
    ]);
    expect(items).toEqual([{ name: "Ana", email: "ana@example.com" }]);
  });
});
