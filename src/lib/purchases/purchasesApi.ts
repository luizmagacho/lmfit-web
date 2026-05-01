import { http } from "@/lib/http";
import { extractListItems, extractListTotal } from "@/lib/normalizeApiList";
import type { PurchaseLineInput, PurchaseRecord } from "./types";

export async function listPurchases(params?: { page?: number; limit?: number; search?: string }) {
  const { page = 1, limit = 50, search } = params ?? {};
  const q: Record<string, string | number> = { page, limit };
  if (search?.trim()) q.search = search.trim();
  const { data } = await http.get<unknown>("/purchases", { params: q });
  const items = extractListItems(data) as PurchaseRecord[];
  return { items, total: extractListTotal(data, items.length) };
}

export async function getPurchase(id: string) {
  const { data } = await http.get<PurchaseRecord>(`/purchases/${encodeURIComponent(id)}`);
  return data;
}

export type CreatePurchaseBody = {
  supplierId: string;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  total?: number | null;
  lines?: PurchaseLineInput[];
};

export async function createPurchase(body: CreatePurchaseBody) {
  const { data } = await http.post<PurchaseRecord>("/purchases", body);
  return data;
}

export type UpdatePurchaseBody = {
  supplierId?: string;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  total?: number | null;
  lines?: PurchaseLineInput[];
};

export async function updatePurchase(id: string, body: UpdatePurchaseBody) {
  const { data } = await http.patch<PurchaseRecord>(`/purchases/${encodeURIComponent(id)}`, body);
  return data;
}
