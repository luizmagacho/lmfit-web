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
};

export async function createOrder(body: CreateOrderBody) {
  const { data } = await http.post<OrderWithWarnings>("/orders", body);
  return data;
}

export type UpdateOrderBody = {
  channel?: OrderChannel;
  status?: string;
  reference?: string | null;
  notes?: string | null;
  total?: number | null;
  lines?: OrderLineInput[];
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
