"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";
import { formatBRL } from "@/lib/formatMoney";
import { http } from "@/lib/http";
import {
  createBatch, fetchBatches, removeBatch, updateBatch,
  DEFAULT_STATUSES, INPUT_TYPE_LABELS, UNIT_LABELS,
  type ProductionBatch, type InputItem, type InputType, type Unit,
} from "@/lib/production/productionApi";
import { ProductionKanbanClient } from "./ProductionKanbanClient";

// ── Batch Editor Modal ────────────────────────────────────────────────────────

const EMPTY_INPUT: InputItem = { description: "", inputType: "fabric", unit: "kg", quantity: 0, unitPrice: 0, totalCost: 0 };

function parseBrlMoney(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const d = String(val).replace(/\D/g, "");
  return d ? parseInt(d, 10) / 100 : 0;
}

function formatBrlMoney(num: number): string {
  return (num || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeCosts(
  inputs: InputItem[], cuttingCost: number, sewingCost: number,
  overheadPercent: number, batchQty: number, targetMarginPercent: number
) {
  const totalInputsCost = inputs.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const laborMat = totalInputsCost + cuttingCost + sewingCost;
  const overhead = (laborMat * overheadPercent) / 100;
  const totalBatchCost = laborMat + overhead;
  const costPerUnit = batchQty > 0 ? totalBatchCost / batchQty : 0;
  const suggestedPrice = targetMarginPercent < 100 ? costPerUnit / (1 - targetMarginPercent / 100) : 0;
  return { totalInputsCost, totalBatchCost, costPerUnit, suggestedPrice };
}

function BatchEditorModal({ batch, allBatches, onClose, onSaved }: {
  batch?: Partial<ProductionBatch> | null;
  allBatches: ProductionBatch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = useLanguage();
  const [name, setName] = useState(batch?.name ?? "");
  const [sku, setSku] = useState(batch?.sku ?? "");
  const [batchQty, setBatchQty] = useState(batch?.batchQty ?? 1);
  const [status, setStatus] = useState(batch?.status ?? DEFAULT_STATUSES[0]);
  const [inputs, setInputs] = useState<InputItem[]>(
    batch?.inputs?.length
      ? batch.inputs.map(i => ({
          ...i,
          unitPrice: parseBrlMoney(i.unitPrice as any),
          totalCost: parseBrlMoney(i.totalCost as any)
        }))
      : [{ ...EMPTY_INPUT }]
  );
  const [cuttingCost, setCuttingCost] = useState(parseBrlMoney(batch?.cuttingCost as any));
  const [sewingCost, setSewingCost] = useState(parseBrlMoney(batch?.sewingCost as any));
  const [overheadPercent, setOverheadPercent] = useState(batch?.overheadPercent ?? 0);
  const [targetMarginPercent, setTargetMarginPercent] = useState(batch?.targetMarginPercent ?? 60);
  const [notes, setNotes] = useState(batch?.notes ?? "");
  const [imageUrl, setImageUrl] = useState(batch?.imageUrl ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const computed = useMemo(
    () => computeCosts(inputs, cuttingCost, sewingCost, overheadPercent, batchQty, targetMarginPercent),
    [inputs, cuttingCost, sewingCost, overheadPercent, batchQty, targetMarginPercent]
  );

  const handleInputChange = (idx: number, field: keyof InputItem, value: string | number) => {
    setInputs(prev => {
      const next = [...prev];
      const row = { ...next[idx], [field]: value };
      row.totalCost = row.quantity * row.unitPrice;
      next[idx] = row;
      return next;
    });
  };

  const handleCheckPrevious = (field: "sku" | "name", value: string) => {
    if (batch?._id || !value.trim()) return;
    // Find the most recent matching batch (assuming allBatches is sorted by newest first, find returns first match)
    const prev = allBatches.find(b => b[field] && b[field]?.toLowerCase() === value.trim().toLowerCase());
    if (prev) {
      // If user already filled some inputs manually, don't interrupt
      const hasFilledCosts = cuttingCost > 0 || sewingCost > 0 || inputs.length > 1 || (inputs[0] && inputs[0].description.trim() !== "");
      if (hasFilledCosts) return;

      if (confirm(isEn 
        ? `Previous batch "${prev.name}" found. Copy inputs and costs?` 
        : `Lote anterior "${prev.name}" encontrado. Deseja copiar os insumos e custos dele?`)) {
        if (field === "sku" && prev.name) setName(prev.name);
        if (field === "name" && prev.sku) setSku(prev.sku);
        if (prev.inputs?.length) {
          setInputs(prev.inputs.map(i => ({
            ...i,
            unitPrice: parseBrlMoney(i.unitPrice as any),
            totalCost: parseBrlMoney(i.totalCost as any)
          })));
        }
        setCuttingCost(parseBrlMoney(prev.cuttingCost as any));
        setSewingCost(parseBrlMoney(prev.sewingCost as any));
        setOverheadPercent(prev.overheadPercent || 0);
        setTargetMarginPercent(prev.targetMarginPercent || 60);
        if (prev.imageUrl && !imageUrl) setImageUrl(prev.imageUrl);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await http.post("/products/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageUrl(res.data.url || (Array.isArray(res.data) && res.data[0]?.url) || "");
    } catch (err) {
      console.error(err);
      alert(isEn ? "Error uploading image." : "Erro ao enviar imagem.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name, sku, batchQty, status, imageUrl,
        inputs: inputs
          .filter(i => i.description.trim() !== "")
          .map(i => ({ ...i, totalCost: i.quantity * i.unitPrice })),
        cuttingCost, sewingCost, overheadPercent, targetMarginPercent, notes,
      };
      if (batch?._id) await updateBatch(batch._id, payload);
      else await createBatch(payload);
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar o lote.");
    }
    finally { setSaving(false); }
  };

  const fieldCls = "w-full border rounded-md px-3 py-1.5 text-sm bg-transparent";
  const fieldStyle = { borderColor: lmfitTokens.border, color: lmfitTokens.text };
  const labelCls = "block text-xs font-medium mb-1";

  const isEn = language === "en";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
            {isEn
              ? (batch?._id ? "Edit Batch" : "New Production Batch")
              : (batch?._id ? "Editar Lote" : "Novo Lote de Produção")}
          </h2>
          <button onClick={onClose} className="text-xl px-2" style={{ color: lmfitTokens.textMuted }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Batch Name *" : "Nome do Lote *"}
              </label>
              <input required value={name} onChange={e => setName(e.target.value)} onBlur={e => handleCheckPrevious("name", e.target.value)} className={fieldCls} style={fieldStyle} placeholder={isEn ? "Ex: Black Legging S/M — May 2026" : "Ex: Legging Preta P/M — Maio 2026"} list="past-names" />
              <datalist id="past-names">
                {Array.from(new Set(allBatches.map(b => b.name).filter(Boolean))).map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "SKU / Reference" : "SKU / Referência"}
              </label>
              <input value={sku} onChange={e => setSku(e.target.value)} onBlur={e => handleCheckPrevious("sku", e.target.value)} className={fieldCls} style={fieldStyle} placeholder="LGG-PRT-PM" list="past-skus" />
              <datalist id="past-skus">
                {Array.from(new Set(allBatches.map(b => b.sku).filter(Boolean))).map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Quantity of Pieces *" : "Qtd de Peças *"}
              </label>
              <input required type="number" min={1} value={batchQty} onChange={e => setBatchQty(Number(e.target.value))} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Status" : "Status"}
              </label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={fieldCls} style={fieldStyle}>
                {DEFAULT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Product Image" : "Imagem da Peça"}
              </label>
              <div className="flex items-center gap-2">
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="h-8 w-8 rounded object-cover border" style={{ borderColor: lmfitTokens.border }} />
                )}
                <label className="flex-1 cursor-pointer border rounded-md px-3 py-1.5 text-xs text-center truncate hover:bg-black/5" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
                  {uploadingImage ? (isEn ? "Uploading..." : "Enviando...") : (isEn ? "Upload Photo" : "Anexar Foto")}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
            </div>
          </div>

          {/* Inputs table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                {isEn ? "Inputs (Raw Materials + Accessories)" : "Insumos (Matéria-prima + Aviamentos)"}
              </label>
              <button type="button" onClick={() => setInputs(p => [...p, { ...EMPTY_INPUT }])} className="text-xs px-3 py-1 rounded-lg border" style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}>
                {isEn ? "+ Input" : "+ Insumo"}
              </button>
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--chart-track)", color: lmfitTokens.textMuted }}>
                    <th className="p-2 text-left">{isEn ? "Input" : "Insumo"}</th>
                    <th className="p-2 text-left">{isEn ? "Type" : "Tipo"}</th>
                    <th className="p-2 text-left">{isEn ? "Unit" : "Unid."}</th>
                    <th className="p-2 text-right">{isEn ? "Qty" : "Qtd"}</th>
                    <th className="p-2 text-right">{isEn ? "Price/Unit" : "Preço/Un."}</th>
                    <th className="p-2 text-right">{isEn ? "Total" : "Total"}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {inputs.map((inp, idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: lmfitTokens.border }}>
                      <td className="p-1.5"><input value={inp.description} onChange={e => handleInputChange(idx, "description", e.target.value)} className="w-full border rounded px-2 py-1 bg-transparent text-xs" style={fieldStyle} placeholder={isEn ? "Cotton fabric..." : "Malha cotton..."} /></td>
                      <td className="p-1.5">
                        <select value={inp.inputType ?? "other"} onChange={e => handleInputChange(idx, "inputType", e.target.value)} className="border rounded px-2 py-1 bg-transparent text-xs w-full" style={fieldStyle}>
                          {(Object.keys(INPUT_TYPE_LABELS) as InputType[]).map(k => <option key={k} value={k}>{INPUT_TYPE_LABELS[k]}</option>)}
                        </select>
                      </td>
                      <td className="p-1.5">
                        <select value={inp.unit ?? "unit"} onChange={e => handleInputChange(idx, "unit", e.target.value)} className="border rounded px-2 py-1 bg-transparent text-xs w-20" style={fieldStyle}>
                          {(Object.keys(UNIT_LABELS) as Unit[]).map(k => <option key={k} value={k}>{UNIT_LABELS[k]}</option>)}
                        </select>
                      </td>
                      <td className="p-1.5"><input type="number" min={0} step="0.001" value={inp.quantity || ""} onChange={e => handleInputChange(idx, "quantity", Number(e.target.value))} className="w-20 border rounded px-2 py-1 bg-transparent text-xs text-right" style={fieldStyle} /></td>
                      <td className="p-1.5"><input type="text" value={formatBrlMoney(inp.unitPrice)} onChange={e => handleInputChange(idx, "unitPrice", parseBrlMoney(e.target.value))} className="w-24 border rounded px-2 py-1 bg-transparent text-xs text-right" style={fieldStyle} /></td>
                      <td className="p-1.5 text-right font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>{formatBRL(inp.quantity * inp.unitPrice)}</td>
                      <td className="p-1.5 text-center"><button type="button" onClick={() => setInputs(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-base leading-none">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Costs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Cutting Cost (batch) R$" : "Custo de Corte (lote) R$"}
              </label>
              <input type="text" value={formatBrlMoney(cuttingCost)} onChange={e => setCuttingCost(parseBrlMoney(e.target.value))} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Sewing Cost (batch) R$" : "Custo de Costura (lote) R$"}
              </label>
              <input type="text" value={formatBrlMoney(sewingCost)} onChange={e => setSewingCost(parseBrlMoney(e.target.value))} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Overhead (%)" : "Overhead (%)"}
              </label>
              <input type="number" min={0} step="0.1" value={overheadPercent} onChange={e => setOverheadPercent(Number(e.target.value))} className={fieldCls} style={fieldStyle} />
            </div>
            <div>
              <label className={labelCls} style={{ color: lmfitTokens.text }}>
                {isEn ? "Desired Margin (%)" : "Margem desejada (%)"}
              </label>
              <input type="number" min={0} max={99} value={targetMarginPercent} onChange={e => setTargetMarginPercent(Number(e.target.value))} className={fieldCls} style={fieldStyle} />
            </div>
          </div>

          {/* Computed preview */}
          <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ backgroundColor: "var(--chart-track)" }}>
            {[
              { label: isEn ? "Total Inputs" : "Total Insumos", value: formatBRL(computed.totalInputsCost) },
              { label: isEn ? "Total Batch Cost" : "Custo Total Lote", value: formatBRL(computed.totalBatchCost), highlight: true },
              { label: isEn ? `Cost/Unit (÷${batchQty})` : `Custo/Peça (÷${batchQty})`, value: formatBRL(computed.costPerUnit), highlight: true },
              { label: isEn ? `Suggested Price (${targetMarginPercent}%)` : `Preço Sugerido (${targetMarginPercent}%)`, value: formatBRL(computed.suggestedPrice) },
            ].map(k => (
              <div key={k.label} className="text-center">
                <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>{k.label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: k.highlight ? lmfitTokens.primary : lmfitTokens.text }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div>
            <label className={labelCls} style={{ color: lmfitTokens.text }}>
              {isEn ? "Notes" : "Observações"}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={fieldCls} style={fieldStyle} />
          </div>
        </form>

        <div className="p-5 border-t flex justify-end gap-2" style={{ borderColor: lmfitTokens.border }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
            {isEn ? "Cancel" : "Cancelar"}
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ backgroundColor: lmfitTokens.primary }}>
            {saving ? (isEn ? "Saving..." : "Salvando…") : (batch?._id ? (isEn ? "Save" : "Salvar") : (isEn ? "Create Batch" : "Criar Lote"))}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cost Summary Card ────────────────────────────────────────────────────────

function BatchRow({ batch, onEdit, onDelete }: { batch: ProductionBatch; onEdit: () => void; onDelete: () => void }) {
  const { language } = useLanguage();
  const STATUS_COLORS: Record<string, string> = {
    Planejado: "#6366f1", Corte: "#f59e0b", Costura: "#3b82f6",
    Acabamento: "#8b5cf6", Pronto: "#10b981",
  };
  const color = STATUS_COLORS[batch.status] ?? lmfitTokens.primary;
  const isEn = language === "en";

  return (
    <tr className="border-b hover:bg-[var(--hover-bg)] transition-colors" style={{ borderColor: lmfitTokens.border }}>
      <td className="py-2.5 px-3">
        <p className="font-medium text-sm" style={{ color: lmfitTokens.text }}>{batch.name}</p>
        {batch.sku && <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>{batch.sku}</p>}
      </td>
      <td className="py-2.5 px-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: color + "22", color }}>
          {batch.status}
        </span>
      </td>
      <td className="py-2.5 px-3 text-sm text-right tabular-nums" style={{ color: lmfitTokens.text }}>{batch.batchQty} {isEn ? "pcs" : "pç"}</td>
      <td className="py-2.5 px-3 text-sm text-right tabular-nums" style={{ color: lmfitTokens.textMuted }}>{formatBRL(batch.totalBatchCost)}</td>
      <td className="py-2.5 px-3 text-sm text-right tabular-nums font-semibold" style={{ color: lmfitTokens.primary }}>{formatBRL(batch.costPerUnit)}</td>
      <td className="py-2.5 px-3 text-sm text-right tabular-nums" style={{ color: lmfitTokens.textMuted }}>{formatBRL(batch.suggestedPrice)}</td>
      <td className="py-2.5 px-3 text-right whitespace-nowrap">
        <button onClick={onEdit} className="text-xs px-2 py-1 mr-1 rounded border" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
          {isEn ? "Edit" : "Editar"}
        </button>
        <button onClick={onDelete} className="text-xs px-2 py-1 rounded border" style={{ borderColor: "#fecaca", color: "#dc2626" }}>
          {isEn ? "Delete" : "Excluir"}
        </button>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProductionClient() {
  const { language } = useLanguage();
  const [tab, setTab] = useState<"list" | "kanban">("kanban");
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProductionBatch> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBatches(1, 100);
      setBatches(res.items);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: string) => {
    const isEn = language === "en";
    if (!confirm(isEn ? "Delete this batch?" : "Excluir este lote?")) return;
    await removeBatch(id);
    void load();
  };

  // Summary KPIs
  const kpis = useMemo(() => {
    const totalBatchCost = batches.reduce((s, b) => s + b.totalBatchCost, 0);
    const totalUnits = batches.reduce((s, b) => s + b.batchQty, 0);
    const avgCostPerUnit = totalUnits > 0 ? totalBatchCost / totalUnits : 0;
    return { totalBatchCost, totalUnits, avgCostPerUnit, batchCount: batches.length };
  }, [batches]);

  const isEn = language === "en";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
            {isEn ? "Production" : "Produção"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
            {isEn
              ? "Manufacturing batches · Cost per piece · Production Kanban"
              : "Lotes de fabricação · Custo por peça · Kanban de produção"}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setEditorOpen(true); }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          {isEn ? "+ New Batch" : "+ Novo Lote"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isEn ? "Registered batches" : "Lotes cadastrados", value: String(kpis.batchCount), color: lmfitTokens.primary },
          { label: isEn ? "Total pieces" : "Total de peças", value: `${kpis.totalUnits} ${isEn ? "pcs" : "pç"}`, color: "#3b82f6" },
          { label: isEn ? "Total cost (batches)" : "CMV total (lotes)", value: formatBRL(kpis.totalBatchCost), color: "#f59e0b" },
          { label: isEn ? "Average cost/piece" : "Custo médio/peça", value: formatBRL(kpis.avgCostPerUnit), color: "#10b981" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-4" style={{ borderColor: lmfitTokens.border, backgroundColor: k.color + "11" }}>
            <p className="text-xs mb-1" style={{ color: k.color + "cc" }}>{k.label}</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: lmfitTokens.border }}>
        {([
          ["kanban", isEn ? "🗂️ Production Kanban" : "🗂️ Kanban de Produção"],
          ["list", isEn ? "📋 Batch List" : "📋 Lista de Lotes"]
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{ borderColor: tab === t ? lmfitTokens.primary : "transparent", color: tab === t ? lmfitTokens.primary : lmfitTokens.textMuted }}>
            {label}
          </button>
        ))}
      </div>

      {/* Kanban Tab */}
      {tab === "kanban" && (
        <ProductionKanbanClient
          batches={batches}
          onEdit={(b) => { setEditing(b); setEditorOpen(true); }}
          onDelete={handleDelete}
          onStatusChange={async (id, status) => { await updateBatch(id, { status }); void load(); }}
          onRefresh={load}
        />
      )}

      {/* List Tab */}
      {tab === "list" && (
        <div className="rounded-xl border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
          {loading ? (
            <p className="p-6 text-sm" style={{ color: lmfitTokens.textMuted }}>
              {isEn ? "Loading..." : "Carregando…"}
            </p>
          ) : batches.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: lmfitTokens.textMuted }}>
              {isEn
                ? "No batches registered. Click on \"+ New Batch\" to start."
                : "Nenhum lote cadastrado. Clique em \"+ Novo Lote\" para começar."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs border-b text-left" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
                    <th className="py-2 px-3">{isEn ? "Batch / SKU" : "Lote / SKU"}</th>
                    <th className="py-2 px-3">{isEn ? "Status" : "Status"}</th>
                    <th className="py-2 px-3 text-right">{isEn ? "Pieces" : "Peças"}</th>
                    <th className="py-2 px-3 text-right">{isEn ? "Total Cost" : "Custo Total"}</th>
                    <th className="py-2 px-3 text-right">{isEn ? "Cost/Piece" : "Custo/Peça"}</th>
                    <th className="py-2 px-3 text-right">{isEn ? "Suggested Price" : "Preço Sugerido"}</th>
                    <th className="py-2 px-3 text-right">{isEn ? "Actions" : "Ações"}</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => (
                    <BatchRow key={b._id} batch={b}
                      onEdit={() => { setEditing(b); setEditorOpen(true); }}
                      onDelete={() => void handleDelete(b._id)} />
                  ))}
                </tbody>
              </table>
              <p className="text-xs p-3 text-right" style={{ color: lmfitTokens.textMuted }}>
                {isEn ? `${total} batch(es) in total` : `${total} lote(s) no total`}
              </p>
            </div>
          )}
        </div>
      )}

      {editorOpen && (
        <BatchEditorModal
          batch={editing}
          allBatches={batches}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
