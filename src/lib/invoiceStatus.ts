/** Client fallback when `GET /invoices/status-options` is unavailable. */
export const INVOICE_STATUS_LABEL_PT_BR: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
  open: "Pendente",
  void: "Cancelada",
};

export type InvoiceStatusCanonical = "pending" | "paid" | "overdue" | "cancelled";

const LEGACY_TO_CANONICAL: Record<string, InvoiceStatusCanonical> = {
  open: "pending",
  void: "cancelled",
  pending: "pending",
  paid: "paid",
  overdue: "overdue",
  cancelled: "cancelled",
};

export function normalizeInvoiceStatusToCanonical(
  stored: string | null | undefined,
): InvoiceStatusCanonical {
  const s = String(stored ?? "")
    .trim()
    .toLowerCase();
  return LEGACY_TO_CANONICAL[s] ?? "pending";
}

export function invoiceStatusLabelFromRow(row: Record<string, unknown>): string {
  const api = row.statusLabelPtBr;
  if (typeof api === "string" && api.trim()) return api;
  const canonical = row.statusCanonical;
  if (typeof canonical === "string" && INVOICE_STATUS_LABEL_PT_BR[canonical])
    return INVOICE_STATUS_LABEL_PT_BR[canonical]!;
  const raw = row.status;
  if (typeof raw === "string") {
    const c = normalizeInvoiceStatusToCanonical(raw);
    return INVOICE_STATUS_LABEL_PT_BR[raw] ?? INVOICE_STATUS_LABEL_PT_BR[c] ?? raw;
  }
  return INVOICE_STATUS_LABEL_PT_BR.pending;
}

export function invoiceStatusCanonicalFromRow(row: Record<string, unknown>): InvoiceStatusCanonical {
  const api = row.statusCanonical;
  if (typeof api === "string") {
    const c = normalizeInvoiceStatusToCanonical(api);
    if (c) return c;
  }
  return normalizeInvoiceStatusToCanonical(
    typeof row.status === "string" ? row.status : undefined,
  );
}

export type InvoiceStatusBadgeStyle = {
  backgroundColor: string;
  color: string;
  borderColor: string;
};

export function invoiceBadgeStyle(canonical: InvoiceStatusCanonical): InvoiceStatusBadgeStyle {
  switch (canonical) {
    case "paid":
      return { backgroundColor: "#e8f7ef", color: "#1e6f45", borderColor: "#b8e0c8" };
    case "overdue":
      return { backgroundColor: "#fedede", color: "#8b1a1a", borderColor: "#f5bcbc" };
    case "cancelled":
      return { backgroundColor: "#f0f0f0", color: "#5d5d5d", borderColor: "#d1d1d1" };
    case "pending":
    default:
      return { backgroundColor: "#fff9e5", color: "#7a5a00", borderColor: "#f0e0a8" };
  }
}
