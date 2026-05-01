import { describe, expect, it } from "vitest";
import {
  invoiceStatusCanonicalFromRow,
  invoiceStatusLabelFromRow,
  normalizeInvoiceStatusToCanonical,
} from "./invoiceStatus";

describe("invoiceStatus", () => {
  it("normalizes legacy and canonical values", () => {
    expect(normalizeInvoiceStatusToCanonical("open")).toBe("pending");
    expect(normalizeInvoiceStatusToCanonical("void")).toBe("cancelled");
    expect(normalizeInvoiceStatusToCanonical("paid")).toBe("paid");
    expect(normalizeInvoiceStatusToCanonical("")).toBe("pending");
  });

  it("prefers API label and canonical from row", () => {
    expect(
      invoiceStatusLabelFromRow({
        status: "open",
        statusCanonical: "pending",
        statusLabelPtBr: "Pendente",
      }),
    ).toBe("Pendente");
    expect(
      invoiceStatusCanonicalFromRow({
        status: "void",
        statusCanonical: "cancelled",
      }),
    ).toBe("cancelled");
  });

  it("falls back when API fields missing", () => {
    expect(invoiceStatusLabelFromRow({ status: "overdue" })).toBe("Vencida");
    expect(invoiceStatusCanonicalFromRow({ status: "open" })).toBe("pending");
  });
});
