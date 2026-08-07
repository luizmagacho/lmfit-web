import { toast } from "react-hot-toast";
import { http } from "@/lib/http";
import { listSyncable, markFailed, markSynced, markSyncing, resetForManualRetry } from "./outbox";
import {
  isLocalCustomerId,
  listSyncableCustomers,
  markCustomerFailed,
  markCustomerSynced,
  repointPendingSalesCustomer,
} from "./customerOutbox";
import type { PendingSaleRow } from "./offlineDb";
import { recordSyncHistoryEntry } from "./syncHistory";

type SyncBatchResultItem = {
  clientSaleId: string;
  orderId: string;
  orderNumber: number;
  status: "ok" | "partial_backorder";
  downgradedLines?: Array<{ variantId: string; requested: number; fulfilled: number }>;
};

let flushing = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let listenersAttached = false;
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

/** Components (e.g. `SyncStatusBadge`) call this to re-read the outbox whenever a flush
 *  finishes — the outbox itself lives in IndexedDB, which has no native React reactivity. */
export function onSyncActivity(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/** `navigator.onLine` is known to false-positive (some browsers only reflect the OS-level
 *  network adapter state, not real internet reachability) — a lightweight hit on the
 *  unauthenticated health route confirms the API is actually reachable before a whole batch
 *  is attempted. */
async function probeOnline(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    await http.get("/health", { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

/** Creates, server-side, every customer that was typed at the counter while offline, and
 *  repoints any sale already queued for that customer to the real id it gets back. Runs before
 *  the sale batch itself — a sale still billed to a `local:` id would otherwise fail the whole
 *  batch's validation (the API only accepts real Mongo ids for `customerId`). Never throws:
 *  a customer that still can't be created (e.g. connection dropped mid-flush) just stays
 *  queued for the next flush, and any sale still pointing at it is silently skipped this round
 *  by `flushNow`'s own filter — not marked failed, since it isn't really the sale's fault. */
async function resolvePendingCustomers(): Promise<void> {
  const customers = await listSyncableCustomers();
  for (const c of customers) {
    try {
      const { data } = await http.post<{ _id?: string; id?: string }>("/customers", { name: c.name });
      const realId = String(data._id ?? data.id ?? "");
      if (!realId) throw new Error("Resposta sem id");
      await markCustomerSynced(c.localId, realId);
      await repointPendingSalesCustomer(c.localId, realId);
    } catch (e) {
      await markCustomerFailed(c.localId, e instanceof Error ? e.message : "Falha ao criar cliente");
    }
  }
}

/** Sends every syncable sale in one batch, applies the per-sale result, and never throws —
 *  a failed flush just leaves the sale queued for the next trigger. Safe to call repeatedly
 *  (e.g. from multiple triggers firing close together): re-entrant calls are no-ops. */
export async function flushNow(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const online = await probeOnline();
    if (!online) return;

    await resolvePendingCustomers();

    const syncable = await listSyncable();
    // A sale still billed to an unresolved `local:` customer isn't ready yet — leave it
    // queued (still "pending", not touched) rather than sending an id the API would reject.
    const sales = syncable.filter((s) => !isLocalCustomerId(s.payload.customerId));
    if (!sales.length) return;

    await Promise.all(sales.map((s) => markSyncing(s.clientSaleId)));
    notify();

    let results: SyncBatchResultItem[];
    try {
      const { data } = await http.post<SyncBatchResultItem[]>("/orders/sync-batch", {
        sales: sales.map((s) => ({
          clientSaleId: s.clientSaleId,
          customerId: s.payload.customerId,
          paymentMethod: s.payload.paymentMethod,
          notes: s.payload.notes,
          lines: s.payload.lines,
          createdAtLocal: s.createdAtLocal,
        })),
      });
      results = data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao sincronizar";
      await Promise.all(sales.map((s) => markFailed(s.clientSaleId, message)));
      notify();
      return;
    }

    const byId = new Map(results.map((r) => [r.clientSaleId, r]));
    await Promise.all(
      sales.map(async (s: PendingSaleRow) => {
        const result = byId.get(s.clientSaleId);
        if (!result) {
          await markFailed(s.clientSaleId, "Sem resposta do servidor para esta venda");
          return;
        }
        await markSynced(s.clientSaleId, {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          partialBackorder: result.status === "partial_backorder",
        });
        if (result.status === "partial_backorder") {
          await recordSyncHistoryEntry({
            clientSaleId: result.clientSaleId,
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            downgradedLines: result.downgradedLines,
          });
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            toast(`Pedido #${result.orderNumber} ajustado na sincronização — parte virou encomenda.`, { icon: "⚠️" });
          }
        }
      }),
    );
    notify();
  } finally {
    flushing = false;
  }
}

/** Operator-triggered retry: resets the backoff budget for every currently-failed sale (an
 *  explicit tap always deserves an immediate attempt) and flushes right away. */
export async function retryFailedNow(): Promise<void> {
  const { listFailed } = await import("./outbox");
  const failed = await listFailed();
  await Promise.all(failed.map((s) => resetForManualRetry(s.clientSaleId)));
  await flushNow();
}

const AUTO_SYNC_INTERVAL_MS = 20_000;

/** Wires every automatic trigger the plan calls for: reconnecting, the tab becoming visible
 *  again, and a periodic background poll. Idempotent — calling it more than once (e.g. if
 *  more than one component mounts) never attaches duplicate listeners. */
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onOnline = () => void flushNow();
  const onVisibility = () => {
    if (document.visibilityState === "visible") void flushNow();
  };

  if (!listenersAttached) {
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    intervalHandle = setInterval(() => void flushNow(), AUTO_SYNC_INTERVAL_MS);
    listenersAttached = true;
  }

  void flushNow();

  return () => {
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
    listenersAttached = false;
  };
}
