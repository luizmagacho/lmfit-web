"use client";

import {
  invoiceBadgeStyle,
  invoiceStatusCanonicalFromRow,
  invoiceStatusLabelFromRow,
  type InvoiceStatusCanonical,
} from "@/lib/invoiceStatus";

type Row = Record<string, unknown>;

export function InvoiceStatusBadge({ row }: { row: Row }) {
  const canonical = invoiceStatusCanonicalFromRow(row) as InvoiceStatusCanonical;
  const label = invoiceStatusLabelFromRow(row);
  const st = invoiceBadgeStyle(canonical);
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: st.backgroundColor,
        color: st.color,
        borderColor: st.borderColor,
      }}
    >
      {label}
    </span>
  );
}
