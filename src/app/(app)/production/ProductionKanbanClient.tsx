"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";
import { formatBRL } from "@/lib/formatMoney";
import { toast } from "react-hot-toast";
import {
  fetchKanban, fetchDistinctStatuses, DEFAULT_STATUSES,
  type ProductionBatch, type KanbanData,
} from "@/lib/production/productionApi";

const STATUS_COLORS: Record<string, string> = {
  Planejado: "#6366f1",
  Corte: "#f59e0b",
  Costura: "#3b82f6",
  Acabamento: "#8b5cf6",
  Pronto: "#10b981",
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  Planejado: { "pt-BR": "Planejado", en: "Planned" },
  Corte: { "pt-BR": "Corte", en: "Cutting" },
  Costura: { "pt-BR": "Costura", en: "Sewing" },
  Acabamento: { "pt-BR": "Acabamento", en: "Finishing" },
  Pronto: { "pt-BR": "Pronto", en: "Ready" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? lmfitTokens.primary;
}

function KanbanCard({
  batch, onEdit, onDelete, onMove, statuses,
}: {
  batch: ProductionBatch;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: string) => void;
  statuses: string[];
}) {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", batch._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="rounded-xl border p-3 space-y-2 bg-[var(--card-bg)] shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      style={{ borderColor: lmfitTokens.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: lmfitTokens.text }}>{batch.name}</p>
          {batch.sku && (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>{batch.sku}</p>
          )}
        </div>
        {batch.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={batch.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover border shrink-0" style={{ borderColor: lmfitTokens.border }} />
        )}
        <select
          value={batch.status}
          onChange={(e) => onMove(e.target.value)}
          className="text-[10px] border rounded-full px-2 py-0.5 font-semibold shrink-0 bg-transparent cursor-pointer"
          style={{ borderColor: getStatusColor(batch.status), color: getStatusColor(batch.status) }}
          title={isEn ? "Move to status" : "Mover para status"}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]?.[language] ?? s}
            </option>
          ))}
        </select>
      </div>

      {/* Cost summary */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--chart-track)" }}>
          <p className="text-[9px] font-medium uppercase tracking-wide mb-0.5" style={{ color: lmfitTokens.textMuted }}>
            {isEn ? "Pieces" : "Peças"}
          </p>
          <p className="text-sm font-bold tabular-nums" style={{ color: lmfitTokens.text }}>{batch.batchQty}</p>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--chart-track)" }}>
          <p className="text-[9px] font-medium uppercase tracking-wide mb-0.5" style={{ color: lmfitTokens.textMuted }}>
            {isEn ? "Cost/Piece" : "Custo/Peça"}
          </p>
          <p className="text-sm font-bold tabular-nums" style={{ color: lmfitTokens.primary }}>{formatBRL(batch.costPerUnit)}</p>
        </div>
      </div>

      {/* Input breakdown */}
      {batch.inputs.length > 0 && (
        <div className="space-y-0.5">
          {batch.inputs.slice(0, 2).map((inp, i) => (
            <div key={i} className="flex justify-between text-[10px]" style={{ color: lmfitTokens.textMuted }}>
              <span className="truncate mr-1">{inp.description}</span>
              <span className="tabular-nums shrink-0">{formatBRL(inp.totalCost || inp.quantity * inp.unitPrice)}</span>
            </div>
          ))}
          {batch.inputs.length > 2 && (
            <p className="text-[10px]" style={{ color: lmfitTokens.textMuted }}>
              {isEn ? `+${batch.inputs.length - 2} input(s)...` : `+${batch.inputs.length - 2} insumo(s)…`}
            </p>
          )}
        </div>
      )}

      <div className="text-[10px] space-y-0.5" style={{ color: lmfitTokens.textMuted }}>
        <div className="flex justify-between">
          <span>{isEn ? "Cut + Sew" : "Corte + Costura"}</span>
          <span className="tabular-nums">{formatBRL(batch.cuttingCost + batch.sewingCost)}</span>
        </div>
        <div className="flex justify-between font-semibold" style={{ color: lmfitTokens.text }}>
          <span>{isEn ? "Total Batch Cost" : "Custo Total Lote"}</span>
          <span className="tabular-nums">{formatBRL(batch.totalBatchCost)}</span>
        </div>
      </div>

      <div className="flex gap-1.5 pt-1 border-t" style={{ borderColor: lmfitTokens.border }}>
        <button onClick={onEdit} className="flex-1 text-[10px] py-1 rounded-md border text-center" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
          {isEn ? "Edit" : "Editar"}
        </button>
        <button onClick={onDelete} className="flex-1 text-[10px] py-1 rounded-md border text-center" style={{ borderColor: "#fecaca", color: "#dc2626" }}>
          {isEn ? "Delete" : "Excluir"}
        </button>
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
          placeholder={isEn ? "Ex: Quality Check" : "Ex: Revisão de Qualidade"}
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

export function ProductionKanbanClient({
  batches, onEdit, onDelete, onStatusChange, onRefresh,
}: {
  batches: ProductionBatch[];
  onEdit: (batch: ProductionBatch) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [columns, setColumns] = useState<string[]>(DEFAULT_STATUSES);
  const [addColOpen, setAddColOpen] = useState(false);
  const [kanban, setKanban] = useState<KanbanData>({});
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const loadKanban = useCallback(async () => {
    try {
      const data = await fetchKanban();
      setKanban(data);
      // merge API statuses with local columns
      const apiStatuses = await fetchDistinctStatuses();
      setColumns(prev => {
        const merged = [...prev];
        for (const s of apiStatuses) {
          if (!merged.includes(s)) merged.push(s);
        }
        return merged;
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadKanban(); }, [loadKanban, batches]);

  const handleMove = async (id: string, status: string) => {
    // Optimistic UI update
    setKanban(prev => {
      const next = { ...prev };
      // Remove from old column
      for (const col of Object.keys(next)) {
        next[col] = next[col].filter(b => b._id !== id);
      }
      // Since we don't have the full batch object here, we rely on the API to update it
      // But we can just refetch immediately which loadKanban does.
      return next;
    });

    await onStatusChange(id, status);
    void loadKanban();
    onRefresh();
  };

  const handleDrop = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const batchId = e.dataTransfer.getData("text/plain");
    if (batchId) {
      void handleMove(batchId, col);
    }
  };

  const handleAddColumn = (name: string) => {
    setColumns(prev => prev.includes(name) ? prev : [...prev, name]);
  };

  const handleRemoveColumn = (col: string) => {
    const batchesInCol = kanban[col] ?? [];
    if (batchesInCol.length > 0) {
      toast.error(isEn
        ? `Move the ${batchesInCol.length} batch(es) from this column before removing it.`
        : `Mova os ${batchesInCol.length} lote(s) desta coluna antes de removê-la.`
      );
      return;
    }
    setColumns(prev => prev.filter(c => c !== col));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          {isEn
            ? "Select status on the card to move it between columns"
            : "Selecione o status no card para mover o lote entre colunas"}
        </p>
        <button
          onClick={() => setAddColOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg border font-medium"
          style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
        >
          {isEn ? "+ Column" : "+ Coluna"}
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map((col) => {
          const cards = kanban[col] ?? [];
          const colColor = getStatusColor(col);
          return (
            <div 
              key={col} 
              className="kanban-col-container shrink-0 w-72 flex flex-col transition-all duration-200" 
              style={{ minWidth: 256 }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverCol(col);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                // Only clear if we actually leave the column (not moving to children)
                if ((e.relatedTarget as HTMLElement)?.closest('.kanban-col-container') !== e.currentTarget) {
                  setDragOverCol(null);
                }
              }}
              onDrop={(e) => handleDrop(e, col)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colColor }} />
                  <span className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {STATUS_LABELS[col]?.[language] ?? col}
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: colColor + "22", color: colColor }}
                  >{cards.length}</span>
                </div>
                <button
                  onClick={() => handleRemoveColumn(col)}
                  className="text-xs opacity-40 hover:opacity-80 transition-opacity"
                  style={{ color: lmfitTokens.textMuted }}
                  title={isEn ? "Remove column" : "Remover coluna"}
                >✕</button>
              </div>

              {/* Cards */}
              <div 
                className={`flex-1 rounded-xl p-3 space-y-3 transition-colors border-2 ${dragOverCol === col ? 'border-dashed' : 'border-transparent'}`} 
                style={{ 
                  backgroundColor: dragOverCol === col ? colColor + "11" : "var(--chart-track)", 
                  borderColor: dragOverCol === col ? colColor : "transparent",
                  minHeight: 200 
                }}
              >
                {cards.map((batch) => (
                  <KanbanCard
                    key={batch._id}
                    batch={batch}
                    statuses={columns}
                    onEdit={() => onEdit(batch)}
                    onDelete={() => onDelete(batch._id)}
                    onMove={(status) => void handleMove(batch._id, status)}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-20">
                    <p className="text-xs text-center" style={{ color: lmfitTokens.textMuted }}>
                      {isEn ? "No batches in this status" : "Nenhum lote neste status"}
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
