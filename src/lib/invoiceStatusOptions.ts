import { http } from "@/lib/http";

export type InvoiceStatusOptionRow = {
  value: string;
  labelPtBr: string;
  descriptionPtBr?: string;
};

export type InvoiceStatusOptionsPayload = {
  statuses: InvoiceStatusOptionRow[];
  legacyMap: Record<string, string>;
  notePtBr?: string;
};

export function defaultInvoiceStatusOptions(): InvoiceStatusOptionsPayload {
  return {
    statuses: [
      {
        value: "pending",
        labelPtBr: "Pendente",
        descriptionPtBr: "Aguardando pagamento.",
      },
      { value: "paid", labelPtBr: "Paga", descriptionPtBr: "Fatura quitada." },
      {
        value: "overdue",
        labelPtBr: "Vencida",
        descriptionPtBr: "Prazo ultrapassado e pagamento ainda pendente.",
      },
      {
        value: "cancelled",
        labelPtBr: "Cancelada",
        descriptionPtBr: "Fatura cancelada ou anulada.",
      },
    ],
    legacyMap: { open: "pending", void: "cancelled" },
    notePtBr:
      "Valores enviados ao criar/editar: pending, paid, overdue, cancelled. Documentos antigos com open/void aparecem como Pendente/Cancelada.",
  };
}

export async function fetchInvoiceStatusOptions(): Promise<InvoiceStatusOptionsPayload> {
  try {
    const { data } = await http.get<InvoiceStatusOptionsPayload>("/invoices/status-options");
    if (data?.statuses?.length) return data;
  } catch {
    /* offline or route not deployed */
  }
  return defaultInvoiceStatusOptions();
}
