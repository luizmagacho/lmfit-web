"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { lmfitTokens } from "@/theme/tokens";
import type { OrderWithWarnings } from "@/lib/orders/types";
import { formatBRL } from "@/lib/formatMoney";
import { orderChannelLabel } from "@/lib/orders/orderChannel";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const DEFAULT_STATUSES = ["open", "picking", "shipped", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  open: "#6366f1",       // Indigo
  picking: "#f59e0b",    // Amber
  shipped: "#3b82f6",    // Blue
  completed: "#10b981",  // Emerald
  cancelled: "#ef4444",  // Red
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  open: { "pt-BR": "Em aberto", en: "Open" },
  picking: { "pt-BR": "Em separação", en: "Picking" },
  shipped: { "pt-BR": "Enviado", en: "Shipped" },
  completed: { "pt-BR": "Concluído", en: "Completed" },
  cancelled: { "pt-BR": "Cancelado", en: "Cancelled" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? lmfitTokens.primary;
}

function OrderKanbanCard({
  item,
  customers,
  onMove,
  statuses,
  updating,
  draggedItem,
  handleDragStart,
  language,
}: {
  item: OrderWithWarnings;
  customers: Record<string, string>;
  onMove: (status: string) => void;
  statuses: string[];
  updating: string | null;
  draggedItem: OrderWithWarnings | null;
  handleDragStart: (e: React.DragEvent, order: OrderWithWarnings) => void;
  language: string;
}) {
  const isEn = language === "en";
  const cid = item.customerId ? String(item.customerId) : "";
  const customerName = cid ? customers[cid] ?? cid : (isEn ? "No customer" : "Sem cliente");
  const channelName = orderChannelLabel(item.channel as string);

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
            #{item.number ?? "—"} {item.reference && `(${item.reference})`}
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
        {customerName}
      </div>

      {item.channel && (
        <span
          className="inline-block text-[9px] font-medium px-2 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: "var(--chart-track)", color: lmfitTokens.textMuted }}
        >
          {channelName}
        </span>
      )}

      {/* Warnings & Alertas */}
      {item.warnings && item.warnings.length > 0 && (
        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mb-2 flex items-center gap-1">
          <span>⚠️</span>
          <span>{item.warnings.length} {isEn ? "warning(s)" : "alerta(s)"}</span>
        </div>
      )}

      <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: lmfitTokens.border }}>
        <div className="text-xs font-bold tabular-nums" style={{ color: lmfitTokens.primary }}>
          {formatBRL(item.total || 0)}
        </div>
        <div className="text-[10px]" style={{ color: lmfitTokens.textMuted }}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("pt-BR", { dateStyle: "short" })
            : "—"}
        </div>
      </div>

      <div className="flex gap-2 pt-2 mt-2">
        <Link
          href={`/orders/${encodeURIComponent(item._id)}`}
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
          placeholder={isEn ? "Ex: Awaiting Payment" : "Ex: Aguardando Pagamento"}
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

export function OrdersKanban({
  orders,
  customers,
  onUpdateStatus,
  lang,
}: {
  orders: OrderWithWarnings[];
  customers: Record<string, string>;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  lang?: string;
}) {
  const { language } = useLanguage();
  const currentLang = lang || language || "pt-BR";
  const isEn = currentLang === "en";

  const [columns, setColumns] = useState<string[]>(DEFAULT_STATUSES);
  const [addColOpen, setAddColOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<OrderWithWarnings | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Dynamic status recovery from loaded items
  useEffect(() => {
    const itemStatuses = Array.from(new Set(orders.map((o) => o.status || ""))).filter(Boolean);
    setColumns((prev) => {
      const merged = [...prev];
      for (const s of itemStatuses) {
        if (!merged.includes(s)) merged.push(s);
      }
      return merged;
    });
  }, [orders]);

  const handleDragStart = (e: React.DragEvent, order: OrderWithWarnings) => {
    setDraggedItem(order);
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
    const itemsInCol = orders.filter((o) => o.status === col);
    if (itemsInCol.length > 0) {
      toast.error(isEn
        ? `Move the ${itemsInCol.length} order(s) from this column before removing it.`
        : `Mova os ${itemsInCol.length} pedido(s) desta coluna antes de removê-la.`
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
          const colItems = orders.filter((o) => o.status === col);

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
                  <OrderKanbanCard
                    key={item._id}
                    item={item}
                    customers={customers}
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
                      {isEn ? "No orders" : "Nenhum pedido"}
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
