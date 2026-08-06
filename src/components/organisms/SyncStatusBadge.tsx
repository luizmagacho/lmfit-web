"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CloudOff, Loader2, RotateCw } from "lucide-react";
import { usePdvStore } from "@/stores/usePdvStore";
import { flushNow, onSyncActivity, retryFailedNow, startAutoSync } from "@/lib/pdv/syncEngine";
import { listRecentSyncHistory } from "@/lib/pdv/syncHistory";
import type { SyncHistoryEntry } from "@/lib/pdv/offlineDb";
import { lmfitTokens } from "@/theme/tokens";

function formatHistoryTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Shows what the offline outbox is doing right now (pending/syncing count, manual retry),
 *  plus an expandable history of sales the sync auto-adjusted into a partial encomenda —
 *  the latter persists in IndexedDB, so it's still visible after a reload even once the
 *  live queue itself has gone back to empty (an operator who already left the terminal
 *  should still see it next time they open the PDV). The live-queue row disappears once
 *  the queue is empty, same as before; the history row disappears only once there's truly
 *  nothing to show either. */
export function SyncStatusBadge() {
  const syncStatus = usePdvStore((s) => s.syncStatus);
  const refreshSyncStatus = usePdvStore((s) => s.refreshSyncStatus);
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const refresh = useCallback(() => {
    void refreshSyncStatus();
    void listRecentSyncHistory().then(setHistory);
  }, [refreshSyncStatus]);

  useEffect(() => {
    refresh();
    const stopAutoSync = startAutoSync();
    const unsubscribe = onSyncActivity(refresh);
    return () => {
      stopAutoSync();
      unsubscribe();
    };
  }, [refresh]);

  const { pendingCount, syncingCount, failedCount } = syncStatus;
  const total = pendingCount + syncingCount + failedCount;
  const busy = syncingCount > 0;

  if (total === 0 && history.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {total > 0 ? (
        <div
          className="flex items-center gap-2 rounded-md border px-2 py-1"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: lmfitTokens.primary }} />
          ) : (
            <CloudOff className="h-3.5 w-3.5" style={{ color: failedCount ? lmfitTokens.error : lmfitTokens.textMuted }} />
          )}
          <span>
            {busy
              ? `Sincronizando ${syncingCount}...`
              : failedCount
                ? `${failedCount} venda(s) não sincronizada(s)`
                : `${pendingCount} venda(s) aguardando conexão`}
          </span>
          {failedCount > 0 && !busy ? (
            <button
              type="button"
              className="flex items-center gap-1 underline"
              style={{ color: lmfitTokens.primary }}
              onClick={() => void retryFailedNow()}
            >
              <RotateCw className="h-3 w-3" />
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="rounded-md border" style={{ borderColor: lmfitTokens.border }}>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1"
            style={{ color: lmfitTokens.text }}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: lmfitTokens.textMuted }} />
            <span>{history.length} venda(s) ajustada(s) na sincronização</span>
            {historyOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
          </button>
          {historyOpen ? (
            <ul className="space-y-1 px-2 pb-2" style={{ color: lmfitTokens.textMuted }}>
              {history.map((h) => (
                <li key={h.id} className="border-t pt-1" style={{ borderColor: lmfitTokens.border }}>
                  <span className="font-medium" style={{ color: lmfitTokens.text }}>
                    Pedido #{h.orderNumber}
                  </span>{" "}
                  — parte virou encomenda ({formatHistoryTime(h.occurredAt)})
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Exposed for callers (e.g. right after `outbox.enqueueSale`) that want to nudge a flush
 *  immediately instead of waiting for the next automatic trigger. */
export { flushNow };
