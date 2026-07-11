import { http } from "@/lib/http";
import { extractListItems, extractListTotal } from "@/lib/normalizeApiList";
import type { OrderChannel } from "./types";
import type { OrderLineInput, OrderWithWarnings } from "./types";

export type OrdersListParams = {
  page?: number;
  limit?: number;
  search?: string;
  channel?: OrderChannel | "";
  /** When supported by lmfit-api, filters pedidos por cliente. */
  customerId?: string;
};

export async function listOrders(params: OrdersListParams) {
  const { page = 1, limit = 20, search, channel, customerId } = params;
  const q: Record<string, string | number> = { page, limit };
  if (search?.trim()) q.search = search.trim();
  if (channel) q.channel = channel;
  if (customerId?.trim()) q.customerId = customerId.trim();
  const { data } = await http.get<unknown>("/orders", { params: q });
  const items = extractListItems(data) as OrderWithWarnings[];
  return { items, total: extractListTotal(data, items.length) };
}

export async function getOrder(id: string) {
  const { data } = await http.get<OrderWithWarnings>(`/orders/${encodeURIComponent(id)}`);
  return data;
}

export type CreateOrderBody = {
  customerId: string;
  channel?: OrderChannel;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  lines?: OrderLineInput[];
  paymentMethod?: "pix" | "cash" | "card";
  couponCode?: string;
  discountTotal?: number;
};

export async function createOrder(body: CreateOrderBody) {
  const { data } = await http.post<OrderWithWarnings>("/orders", body);
  return data;
}

/** Valida um cupom contra o subtotal atual — não confirma o uso (isso só acontece ao criar o pedido). */
export async function validatePromotion(code: string, subtotal: number) {
  const { data } = await http.post<{ discountAmount: number }>("/promotions/validate", { code, subtotal });
  return data;
}

export type UpdateOrderBody = {
  channel?: OrderChannel;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  total?: number | null;
  lines?: OrderLineInput[];
  paymentMethod?: "pix" | "cash" | "card";
};

export async function updateOrder(id: string, body: UpdateOrderBody) {
  const { data } = await http.patch<OrderWithWarnings>(`/orders/${encodeURIComponent(id)}`, body);
  return data;
}

export function ordersExportParams(extra: { search?: string; channel?: OrderChannel | "" }) {
  const p: Record<string, string> = { format: "xlsx" };
  if (extra.search?.trim()) p.search = extra.search.trim();
  if (extra.channel) p.channel = extra.channel;
  return p;
}
