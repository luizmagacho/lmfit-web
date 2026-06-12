"use client";

import { useEffect, useState } from "react";
import { lmfitTokens } from "@/theme/tokens";
import type { PurchaseRecord } from "@/lib/purchases/types";
import { formatBRL } from "@/lib/formatMoney";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "react-hot-toast";

const DEFAULT_STATUSES = ["pending", "started", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#64748b",        // Slate
  started: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",      // Red
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  pending: { "pt-BR": "Pendente", en: "Pending" },
  started: { "pt-BR": "Iniciado", en: "Started" },
  completed: { "pt-BR": "Finalizado", en: "Completed" },
  cancelled: { "pt-BR": "Cancelado", en: "Cancelled" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? lmfitTokens.primary;
}

function PurchaseKanbanCard({
  item,
  suppliers,
  onMove,
  statuses,
  updating,
  draggedItem,
  handleDragStart,
  language,
}: {
  item: PurchaseRecord;
  suppliers: Record<string, string>;
  onMove: (status: string) => void;
  statuses: string[];
  updating: string | null;
  draggedItem: PurchaseRecord | null;
  handleDragStart: (e: React.DragEvent, purchase: PurchaseRecord) => void;
  language: string;
}) {
  const isEn = language === "en";
  const sidRaw = item.supplierId;
  const sidStr = sidRaw && typeof sidRaw === 'object' && '_id' in sidRaw ? String((sidRaw as Record<string, unknown>)._id) : String(sidRaw ?? "");
  const supplierName = sidRaw && typeof sidRaw === 'object' && 'name' in sidRaw ? String((sidRaw as Record<string, unknown>).name) : (suppliers[sidStr] ?? sidStr);
  const displayName = supplierName || (isEn ? "No supplier" : "Sem fornecedor");

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      className={`p-3 rounded-lg border bg-[var(--card-bg)] shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${updating === item._id || draggedItem?._id === item._id ? "opacity-50" : ""}`}
      style={{ borderColor: lmfitTokens.border }}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold truncate block" style={{ color: lmfitTokens.textMuted }}>
            {item.reference || (isEn ? "No Ref." : "Sem Ref.")}
          </span>
        </div>
        <select
          value={item.status || ""}
          onChange={(e) => onMove(e.target.value)}
          className="text-[10px] border rounded-full px-2 py-0.5 font-semibold shrink-0 bg-transparent cursor-pointer outline-none"
          style={{ borderColor: getStatusColor(item.status || ""), color: getStatusColor(item.status || "") }}
          title={isEn ? "Move to status" : "Mover para status"}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]?.[language] ?? s}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm font-bold mb-1 line-clamp-1" style={{ color: lmfitTokens.text }}>
        {displayName}
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="text-xs font-bold tabular-nums" style={{ color: lmfitTokens.primary }}>
          {formatBRL(item.total || 0)}
        </div>
        <div className="text-[10px]" style={{ color: lmfitTokens.textMuted }}>
          {Array.isArray(item.lines) ? item.lines.length : 0} {isEn ? "lines" : "linhas"}
        </div>
      </div>

      <div className="flex gap-2 pt-2 mt-2 border-t" style={{ borderColor: lmfitTokens.border }}>
        <Link
          href={`/purchases/${encodeURIComponent(item._id)}`}
          className="flex-1 text-[10px] py-1 rounded-md border text-center font-medium block hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          {isEn ? "Open" : "Abrir"}
        </Link>
      </div>
    </div>
  );
}

function AddColumnModal({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[var(--card-bg)] rounded-xl shadow-xl p-5 w-full max-w-xs space-y-4" style={{ borderColor: lmfitTokens.border }}>
        <h3 className="font-semibold text-sm" style={{ color: lmfitTokens.text }}>
          {isEn ? "New Column (Status)" : "Nova Coluna (Status)"}
        </h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onAdd(name.trim()); onClose(); } }}
          placeholder={isEn ? "Ex: Review" : "Ex: Revisão"}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
            {isEn ? "Cancel" : "Cancelar"}
          </button>
          <button
            onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose(); } }}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {isEn ? "Add" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const { language } = useLanguage();
  const currentLang = lang || language || "pt-BR";
  const isEn = currentLang === "en";

  const [columns, setColumns] = useState<string[]>(DEFAULT_STATUSES);
  const [addColOpen, setAddColOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<PurchaseRecord | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Dynamic status recovery from loaded items
  useEffect(() => {
    const itemStatuses = Array.from(new Set(purchases.map((p) => p.status || ""))).filter(Boolean);
    setColumns((prev) => {
      const merged = [...prev];
      for (const s of itemStatuses) {
        if (!merged.includes(s)) merged.push(s);
      }
      return merged;
    });
  }, [purchases]);

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

  const handleMove = async (id: string, status: string) => {
    setUpdating(id);
    await onUpdateStatus(id, status);
    setUpdating(null);
  };

  const handleAddColumn = (name: string) => {
    setColumns((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const handleRemoveColumn = (col: string) => {
    const itemsInCol = purchases.filter((p) => p.status === col);
    if (itemsInCol.length > 0) {
      toast.error(isEn
        ? `Move the ${itemsInCol.length} purchase(s) from this column before removing it.`
        : `Mova as ${itemsInCol.length} compra(s) desta coluna antes de removê-la.`
      );
      return;
    }
    setColumns((prev) => prev.filter((c) => c !== col));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          {isEn
            ? "Drag cards or select status on the card to move it between columns"
            : "Arraste os cards ou selecione o status no card para movê-lo entre colunas"}
        </p>
        <button
          onClick={() => setAddColOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
        >
          {isEn ? "+ Column" : "+ Coluna"}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start" style={{ minHeight: "60vh" }}>
        {columns.map((col) => {
          const colColor = getStatusColor(col);
          const colItems = purchases.filter((p) => p.status === col);

          return (
            <div
              key={col}
              className="flex flex-col w-72 shrink-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: colColor }} />
                  <span className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {STATUS_LABELS[col]?.[currentLang] ?? col}
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: colColor + "22", color: colColor }}
                  >
                    {colItems.length}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveColumn(col)}
                  className="text-xs opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: lmfitTokens.textMuted }}
                  title={isEn ? "Remove column" : "Remover coluna"}
                >
                  ✕
                </button>
              </div>

              {/* Cards Container */}
              <div
                className="flex-1 rounded-xl p-3 space-y-3 border transition-colors min-h-[250px]"
                style={{
                  backgroundColor: "var(--chart-track)",
                  borderColor: draggedItem ? colColor + "44" : "transparent"
                }}
              >
                {colItems.map((item) => (
                  <PurchaseKanbanCard
                    key={item._id}
                    item={item}
                    suppliers={suppliers}
                    statuses={columns}
                    updating={updating}
                    draggedItem={draggedItem}
                    handleDragStart={handleDragStart}
                    onMove={(status) => void handleMove(item._id, status)}
                    language={currentLang}
                  />
                ))}
                {colItems.length === 0 && (
                  <div className="flex items-center justify-center h-24">
                    <p className="text-xs text-center" style={{ color: lmfitTokens.textMuted }}>
                      {isEn ? "No purchases" : "Nenhuma compra"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {addColOpen && (
        <AddColumnModal onAdd={handleAddColumn} onClose={() => setAddColOpen(false)} />
      )}
    </div>
  );
}
