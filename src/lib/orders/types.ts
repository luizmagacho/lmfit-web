export type OrderChannel = "in_person" | "online" | "site" | "whatsapp" | "banca";

export type OrderStatus = "open" | "picking" | "shipped" | "completed" | "cancelled";

export type OrderWarningType = "shortfall" | "pending_purchase";

export type OrderWarning = {
  variantId: string;
  type: OrderWarningType;
  messagePtBr: string;
  suggestCreatePurchase: boolean;
  shortfall?: number;
  pendingPurchaseQty?: number;
};

export type StockConflict = {
  variantId: string;
  sku: string;
  needed: number;
  available: number;
  messagePtBr: string;
};

/** Payload aligned with API create/update line items */
export type OrderLineInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
  productionPrice?: number;
  description?: string | null;
};

export type OrderRecord = {
  _id: string;
  number?: number;
  customerId?: string;
  channel?: OrderChannel | string;
  status?: OrderStatus | string;
  reference?: string | null;
  notes?: string | null;
  total?: number;
  lines?: OrderLineInput[] | Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
};

export type OrderWithWarnings = OrderRecord & { warnings?: OrderWarning[] };

export function isLinesLockedStatus(status: string | undefined | null): boolean {
  return status === "picking" || status === "shipped" || status === "completed";
}
