"use client";

import { useEffect, useMemo, useState } from "react";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { fetchInvoiceStatusOptions, type InvoiceStatusOptionsPayload } from "@/lib/invoiceStatusOptions";
import { lmfitTokens } from "@/theme/tokens";

export function InvoicesClient() {
  const [opts, setOpts] = useState<InvoiceStatusOptionsPayload | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchInvoiceStatusOptions().then((o) => {
      if (!cancelled) setOpts(o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const listExtra = useMemo(
    () => (statusFilter ? { status: statusFilter } : undefined),
    [statusFilter],
  );

  const columns: ResourceColumn[] = useMemo(() => {
    if (!opts) return [];
    const selectOpts = opts.statuses.map((s) => ({
      value: s.value,
      label: s.labelPtBr,
      description: s.descriptionPtBr,
    }));
    return [
      { key: "_id", label: "ID", editable: false },
      { key: "number", label: "Número" },
      {
        key: "status",
        label: "Status",
        fieldType: "select",
        selectOptions: selectOpts,
        defaultValue: "pending",
        legacyValueMap: opts.legacyMap,
      },
      { key: "amount", label: "Valor", fieldType: "number" },
      { key: "dueDate", label: "Vencimento" },
    ];
  }, [opts]);

  if (!opts) {
    return (
      <div className="p-4 text-sm" style={{ color: lmfitTokens.textMuted }}>
        Carregando opções de status…
      </div>
    );
  }

  return (
    <ResourceList
      title="Contas a receber"
      endpoint="/invoices"
      columns={columns}
      exportFileBase="contas-a-receber"
      extraListParams={listExtra}
      cellRender={{ status: (row) => <InvoiceStatusBadge row={row} /> }}
      toolbarExtras={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <label className="flex flex-col gap-1 text-sm shrink-0" style={{ color: lmfitTokens.textMuted }}>
            Filtrar por status
            <select
              className="min-h-11 border rounded-md px-3 py-2 bg-[var(--card-bg)] min-w-[10rem]"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {opts.statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.labelPtBr}
                </option>
              ))}
            </select>
          </label>
          {opts.notePtBr ? (
            <p className="text-xs leading-relaxed max-w-2xl" style={{ color: lmfitTokens.textMuted }}>
              {opts.notePtBr}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
