"use client";

import { useState } from "react";
import { http } from "@/lib/http";
import { lmfitTokens } from "@/theme/tokens";
import type { PurchaseRecord } from "@/lib/purchases/types";
import { formatBRL } from "@/lib/formatMoney";
import Link from "next/link";

const COLUMNS = [
  { id: "interest", pt: "Interesse", en: "Interest" },
  { id: "order_reserved", pt: "Reserva de Pedido", en: "Order Reserved" },
  { id: "in_transit", pt: "Em Trânsito", en: "In Transit" },
  { id: "received", pt: "Recebido", en: "Received" },
  { id: "cancelled", pt: "Cancelado", en: "Cancelled" },
];

export function PurchasesKanban({
  purchases,
  suppliers,
  onUpdateStatus,
  lang,
}: {
  purchases: PurchaseRecord[];
  suppliers: Record<string, string>;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  lang?: string;
}) {
  const [draggedItem, setDraggedItem] = useState<PurchaseRecord | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, purchase: PurchaseRecord) => {
    setDraggedItem(purchase);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.status !== statusId) {
      setUpdating(draggedItem._id);
      await onUpdateStatus(draggedItem._id, statusId);
      setUpdating(null);
    }
    setDraggedItem(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start" style={{ minHeight: "60vh" }}>
      {COLUMNS.map((col) => {
        const colItems = purchases.filter((p) => p.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col w-72 shrink-0 rounded-xl border bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: lmfitTokens.border }}>
              <h3 className="font-semibold text-sm" style={{ color: lmfitTokens.text }}>{lang === "en" ? col.en : col.pt}</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10" style={{ color: lmfitTokens.textMuted }}>
                {colItems.length}
              </span>
            </div>
            <div className="p-2 flex flex-col gap-2 min-h-[150px]">
              {colItems.map((item) => (
                <div
                  key={item._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`p-3 rounded-lg border bg-[var(--bg)] shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${updating === item._id || draggedItem?._id === item._id ? "opacity-50" : ""}`}
                  style={{ borderColor: lmfitTokens.border }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium" style={{ color: lmfitTokens.textMuted }}>
                      {item.reference || "Sem Ref."}
                    </span>
                    <Link
                      href={`/purchases/${encodeURIComponent(item._id)}`}
                      className="text-[10px] hover:underline"
                      style={{ color: lmfitTokens.primary }}
                    >
                      Abrir
                    </Link>
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ color: lmfitTokens.text }}>
                    {(() => {
                      const sidRaw = item.supplierId;
                      const sidStr = sidRaw && typeof sidRaw === 'object' && '_id' in sidRaw ? String((sidRaw as any)._id) : String(sidRaw ?? "");
                      const supplierName = sidRaw && typeof sidRaw === 'object' && 'name' in sidRaw ? String((sidRaw as any).name) : (suppliers[sidStr] ?? sidStr);
                      return supplierName || (lang === "en" ? "No supplier" : "Sem fornecedor");
                    })()}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {formatBRL(item.total || 0)}
                    </div>
                    <div className="text-[10px]" style={{ color: lmfitTokens.textMuted }}>
                      {Array.isArray(item.lines) ? item.lines.length : 0} {lang === "en" ? "lines" : "linhas"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
