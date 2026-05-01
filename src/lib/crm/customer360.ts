import { isAxiosError } from "axios";
import { http } from "@/lib/http";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { listOrders } from "@/lib/orders/ordersApi";
import type { OrderWithWarnings } from "@/lib/orders/types";
import type { TimelineEntry } from "./types";

export type CustomerRecord = Record<string, unknown>;

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export async function fetchCustomerById(id: string): Promise<CustomerRecord | null> {
  try {
    const { data } = await http.get<CustomerRecord>(`/customers/${encodeURIComponent(id)}`);
    return data && typeof data === "object" ? data : null;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) {
      /* fall through */
    } else if (!isAxiosError(e)) {
      throw e;
    }
  }
  try {
    const { data } = await http.get<unknown>("/customers", { params: { page: 1, limit: 500 } });
    const items = extractListItems(data);
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      if (documentId(raw) === id) return raw as CustomerRecord;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchOrdersForCustomer(customerId: string): Promise<OrderWithWarnings[]> {
  const { items } = await listOrders({ customerId, page: 1, limit: 100 });
  const filtered = items.filter((o) => String(o.customerId ?? "") === customerId);
  if (filtered.length) return filtered;
  const { items: page } = await listOrders({ page: 1, limit: 100 });
  return page.filter((o) => String(o.customerId ?? "") === customerId);
}

export async function fetchInvoicesForCustomer(customerId: string): Promise<CustomerRecord[]> {
  try {
    const { data } = await http.get<unknown>("/invoices", { params: { page: 1, limit: 100 } });
    const items = extractListItems(data);
    return items
      .filter((row): row is CustomerRecord => row != null && typeof row === "object")
      .filter((row) => {
        const cid = row.customerId ?? row.customer_id;
        return cid != null && String(cid) === customerId;
      });
  } catch {
    return [];
  }
}

export async function fetchEscalationsForWa(waId: string | undefined): Promise<CustomerRecord[]> {
  if (!waId?.trim()) return [];
  const needle = onlyDigits(waId);
  if (!needle) return [];
  try {
    const { data } = await http.get<unknown>("/internal/whatsapp/escalations", {
      params: { page: 1, limit: 100 },
    });
    const items = extractListItems(data);
    return items
      .filter((row): row is CustomerRecord => row != null && typeof row === "object")
      .filter((row) => {
        const from = row.fromWaId != null ? onlyDigits(String(row.fromWaId)) : "";
        return from && (from === needle || from.endsWith(needle) || needle.endsWith(from));
      });
  } catch {
    return [];
  }
}

export function buildTimeline(params: {
  orders: OrderWithWarnings[];
  invoices: CustomerRecord[];
  escalations: CustomerRecord[];
}): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  for (const o of params.orders) {
    const id = String(o._id ?? "");
    const at = o.updatedAt != null ? String(o.updatedAt) : o.createdAt != null ? String(o.createdAt) : "";
    out.push({
      id: `order-${id}`,
      kind: "order",
      title: `Pedido ${o.reference != null && String(o.reference) !== "" ? String(o.reference) : id}`,
      subtitle: o.status != null ? String(o.status) : undefined,
      at: at || new Date(0).toISOString(),
      href: id ? `/orders/${encodeURIComponent(id)}` : undefined,
    });
  }
  for (const inv of params.invoices) {
    const id = documentId(inv);
    const at = inv.updatedAt != null ? String(inv.updatedAt) : inv.createdAt != null ? String(inv.createdAt) : "";
    out.push({
      id: `inv-${id}`,
      kind: "invoice",
      title: `NF ${inv.number != null ? String(inv.number) : id}`,
      subtitle: inv.status != null ? String(inv.status) : undefined,
      at: at || new Date(0).toISOString(),
    });
  }
  for (const e of params.escalations) {
    const wamid = e.wamid != null ? String(e.wamid) : String(Math.random());
    const at = e.createdAt != null ? String(e.createdAt) : "";
    out.push({
      id: `esc-${wamid}`,
      kind: "escalation",
      title: "Escalação WhatsApp",
      subtitle: e.processingStatus != null ? String(e.processingStatus) : undefined,
      at: at || new Date(0).toISOString(),
    });
  }
  out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return out;
}
