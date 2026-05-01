export type PurchaseLineInput = {
  variantId: string;
  quantityOrdered: number;
  quantityReceived?: number | null;
};

export type PurchaseRecord = {
  _id: string;
  supplierId?: string;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  total?: number;
  lines?: PurchaseLineInput[] | Record<string, unknown>[];
  createdAt?: string;
  updatedAt?: string;
};
