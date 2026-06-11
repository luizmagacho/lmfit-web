"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { showConfirmToast } from "@/lib/ToastHelper";
import { http } from "@/lib/http";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";
import type { InfinitepayReport, ParsedTransaction } from "@/lib/infinitepay/types";
import { fetchDre, type DreResponse } from "@/lib/production/productionApi";
import { rangeIso } from "@/lib/dashboardApi";

// ─── Types ──────────────────────────────────────────────────────────────────

type BatchInfo = {
  _id: string;
  count: number;
  totalIn: number;
  totalOut: number;
  periodFrom?: string;
  periodTo?: string;
  importedAt: string;
  source: string;
};

type SummaryData = {
  totalIn: number;
  totalOut: number;
  balance: number;
  salesIn: number;
  pixIn: number;
  pixOut: number;
  count: number;
  daily: { date: string; in: number; out: number }[];
};

type ApiEntry = {
  _id: string;
  date: string;
  hour?: string;
  type: string;
  name?: string;
  detail?: string;
  amount: number;
  importBatch: string;
  aiAnalysis?: {
    category?: string;
    customerHint?: string | null;
    entityType?: string;
    confidence?: number;
    notes?: string;
    reconciled?: boolean;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(n: number | string) {
  const num = typeof n === 'string' 
    ? parseFloat(n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) 
    : n;
  const validNum = isNaN(num) || num === null || num === undefined ? 0 : num;
  return Math.abs(validNum).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getRawNumber(n: number | string): number {
  if (typeof n === 'number') return n;
  if (typeof n === 'string') {
    const parsed = parseFloat(n.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function txTypeLabel(type: string, lang: string) {
  if (type === "deposit_sales") return lang === "en" ? "Card Sale" : "Venda Cartão";
  if (type === "pix_received") return lang === "en" ? "Pix Received" : "Pix Recebido";
  if (type === "pix_sent") return lang === "en" ? "Pix Sent" : "Pix Enviado";
  return lang === "en" ? "Others" : "Outros";
}

function txTypeBadgeStyle(type: string): React.CSSProperties {
  if (type === "deposit_sales") return { backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
  if (type === "pix_received") return { backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" };
  if (type === "pix_sent") return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
  return { backgroundColor: "var(--chart-track)", color: "var(--lmfit-text-muted)" };
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

function DailyChart({ data, lang }: { data: { date: string; in: number; out: number }[], lang: string }) {
  if (!data.length) return null;
  const maxVal = data.reduce((m, d) => Math.max(m, d.in, d.out), 0);
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5" style={{ minWidth: data.length * 36, height: 100 }}>
        {data.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1" style={{ minWidth: 28 }}>
            <div className="flex items-end gap-1 flex-1 w-full">
              <div
                className="flex-1 rounded-sm transition-all shadow-sm"
                style={{
                  height: maxVal ? `${Math.round((d.in / maxVal) * 100)}%` : "0%",
                  backgroundColor: lmfitTokens.primary,
                  minHeight: d.in > 0 ? 3 : 0,
                }}
                title={lang === "en" ? `Incomes: ${formatBRL(d.in)}` : `Entradas: ${formatBRL(d.in)}`}
              />
              <div
                className="flex-1 rounded-sm transition-all shadow-sm"
                style={{
                  height: maxVal ? `${Math.round((d.out / maxVal) * 100)}%` : "0%",
                  backgroundColor: "#ef4444",
                  minHeight: d.out > 0 ? 3 : 0,
                }}
                title={lang === "en" ? `Expenses: ${formatBRL(d.out)}` : `Saídas: ${formatBRL(d.out)}`}
              />
            </div>
            <span className="text-[10px] tabular-nums font-semibold" style={{ color: lmfitTokens.text }}>
              {d.date.split("-").slice(2).join("")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-5 mt-4 text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded shadow-sm" style={{ backgroundColor: lmfitTokens.primary }} />
          {lang === "en" ? "Incomes" : "Entradas"}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded shadow-sm" style={{ backgroundColor: "#ef4444" }} />
          {lang === "en" ? "Expenses" : "Saídas"}
        </span>
      </div>
    </div>
  );
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

function UploadZone({ onFile }: { onFile: (f: File) => void }) {
  const { language } = useLanguage();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none"
      style={{
        borderColor: dragging ? lmfitTokens.primary : lmfitTokens.border,
        backgroundColor: dragging ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
      }}
    >
      <div className="text-4xl mb-3">📄</div>
      <p className="font-medium" style={{ color: lmfitTokens.text }}>
        {language === "en" ? "Drag and drop InfinitePay PDF here" : "Arraste e solte o PDF da InfinitePay aqui"}
      </p>
      <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
        {language === "en" ? "or click to select file" : "ou clique para selecionar o arquivo"}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  report,
  onConfirm,
  onCancel,
  loading,
  lang,
}: {
  report: InfinitepayReport;
  onConfirm: (analyzeAi: boolean, selectedTxs: ParsedTransaction[]) => void;
  onCancel: () => void;
  loading: boolean;
  lang: string;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(report.transactions.map((_, i) => i)));

  const toggleAll = () => {
    if (selected.size === report.transactions.length) setSelected(new Set());
    else setSelected(new Set(report.transactions.map((_, i) => i)));
  };

  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const selectedTxs = report.transactions.filter((_, i) => selected.has(i));
  const totalIn = selectedTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = selectedTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const balance = totalIn + totalOut;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: lmfitTokens.border }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: lmfitTokens.text }}>
              {lang === "en" ? "Statement Preview" : "Pré-visualização do Extrato"}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
              {report.companyName} · {report.periodFrom} → {report.periodTo}
            </p>
          </div>
          <button onClick={onCancel} className="text-xl leading-none px-2" style={{ color: lmfitTokens.textMuted }}>×</button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6 border-b" style={{ borderColor: lmfitTokens.border }}>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>
              {lang === "en" ? "Incomes" : "Entradas"}
            </p>
            <p className="text-lg font-bold" style={{ color: "#065f46" }}>{formatBRL(totalIn)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>
              {lang === "en" ? "Expenses" : "Saídas"}
            </p>
            <p className="text-lg font-bold" style={{ color: "#991b1b" }}>{formatBRL(totalOut)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>
              {lang === "en" ? "Balance" : "Saldo"}
            </p>
            <p className="text-lg font-bold" style={{ color: lmfitTokens.text }}>{formatBRL(balance)}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <p className="text-xs mb-2" style={{ color: lmfitTokens.textMuted }}>
            {lang === "en"
              ? `${selected.size} of ${report.transactions.length} transactions selected`
              : `${selected.size} de ${report.transactions.length} transações selecionadas`}
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
                <th className="py-1 pr-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selected.size === report.transactions.length && report.transactions.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="py-1 pr-2">{lang === "en" ? "Date" : "Data"}</th>
                <th className="py-1 pr-2">{lang === "en" ? "Type" : "Tipo"}</th>
                <th className="py-1 pr-2">{lang === "en" ? "Name" : "Nome"}</th>
                <th className="py-1 text-right">{lang === "en" ? "Value" : "Valor"}</th>
              </tr>
            </thead>
            <tbody>
              {report.transactions.map((tx, i) => (
                <tr
                  key={i}
                  className="border-b transition-colors"
                  style={{
                    borderColor: lmfitTokens.border,
                    backgroundColor: selected.has(i) ? "transparent" : "#f9fafb",
                    opacity: selected.has(i) ? 1 : 0.6,
                  }}
                >
                  <td className="py-1.5 pr-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleOne(i)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap" style={{ color: lmfitTokens.textMuted }}>
                    {tx.date.split("-").reverse().join("/")} {tx.hour}
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={txTypeBadgeStyle(tx.type)}>
                      {txTypeLabel(tx.type, lang)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 max-w-[150px] truncate" style={{ color: lmfitTokens.text }}>{tx.name}</td>
                  <td className="py-1.5 text-right tabular-nums font-medium" style={{ color: tx.amount >= 0 ? "#065f46" : "#991b1b" }}>
                    {tx.amount >= 0 ? "+" : ""}{formatBRL(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t flex flex-wrap gap-3 justify-end" style={{ borderColor: lmfitTokens.border }}>
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
            {lang === "en" ? "Cancel" : "Cancelar"}
          </button>
          <button
            onClick={() => onConfirm(false, selectedTxs)}
            disabled={loading || selected.size === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
          >
            {loading ? (lang === "en" ? "Importing…" : "Importando…") : (lang === "en" ? "Import" : "Importar")}
          </button>
          <button
            onClick={() => onConfirm(true, selectedTxs)}
            disabled={loading || selected.size === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {loading ? (lang === "en" ? "Importing…" : "Importando…") : (lang === "en" ? "✨ Import + AI Analysis" : "✨ Importar + Análise com IA")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Entry Modal ──────────────────────────────────────────────────────────

function ManualEntryModal({
  entry,
  onClose,
  onSave,
  lang,
}: {
  entry?: Partial<ApiEntry> | null;
  onClose: () => void;
  onSave: (data: Partial<ApiEntry>) => Promise<void>;
  lang: string;
}) {
  const [form, setForm] = useState({
    date: entry?.date ? entry.date.split("T")[0] : new Date().toISOString().split("T")[0],
    hour: entry?.hour || "12:00",
    type: entry?.type || "deposit_sales",
    name: entry?.name || "",
    detail: entry?.detail || "",
    amount: entry?.amount ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(entry.amount)) : "",
    isExpense: entry?.amount ? entry.amount < 0 : false,
  });
  const [saving, setSaving] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setForm({ ...form, amount: "" });
      return;
    }
    const num = Number(value) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    setForm({ ...form, amount: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanVal = form.amount.replace(/\./g, "").replace(",", ".");
      const amountNum = parseFloat(cleanVal) || 0;
      await onSave({
        date: new Date(form.date).toISOString(),
        hour: form.hour,
        type: form.type,
        name: form.name,
        detail: form.detail,
        amount: form.isExpense ? -Math.abs(amountNum) : Math.abs(amountNum),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card-bg)] rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
            {entry?._id ? (lang === "en" ? "Edit Entry" : "Editar Lançamento") : (lang === "en" ? "New Entry" : "Novo Lançamento")}
          </h2>
          <button onClick={onClose} className="text-xl" style={{ color: lmfitTokens.textMuted }}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Date" : "Data"}</label>
              <input required type="date" lang={lang === "en" ? "en" : "pt-BR"} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Time" : "Hora"}</label>
              <input required type="time" lang={lang === "en" ? "en" : "pt-BR"} value={form.hour} onChange={e => setForm({ ...form, hour: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Type" : "Tipo"}</label>
            <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
              <option value="deposit_sales">{lang === "en" ? "Card Sale" : "Venda Cartão"}</option>
              <option value="pix_received">{lang === "en" ? "Pix Received" : "Pix Recebido"}</option>
              <option value="pix_sent">{lang === "en" ? "Pix Sent" : "Pix Enviado"}</option>
              <option value="other">{lang === "en" ? "Other" : "Outro"}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Name" : "Nome"}</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Detail" : "Detalhe"}</label>
            <input type="text" value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: lmfitTokens.text }}>{lang === "en" ? "Amount (R$)" : "Valor (R$)"}</label>
              <input required type="text" value={form.amount} onChange={handleAmountChange} className="w-full border rounded-md px-3 py-1.5 text-sm bg-transparent" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
            </div>
            <label className="flex items-center gap-2 mb-2 text-sm cursor-pointer" style={{ color: lmfitTokens.text }}>
              <input type="checkbox" checked={form.isExpense} onChange={e => setForm({ ...form, isExpense: e.target.checked })} />
              {lang === "en" ? "Is Expense" : "É Saída"}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-4" style={{ borderColor: lmfitTokens.border }}>
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md border text-sm" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>{lang === "en" ? "Cancel" : "Cancelar"}</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-md text-sm text-white" style={{ backgroundColor: lmfitTokens.primary }}>{saving ? (lang === "en" ? "Saving..." : "Salvando...") : (lang === "en" ? "Save" : "Salvar")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialClient() {
  const { language } = useLanguage();
  const [tab, setTab] = useState<"dashboard" | "history" | "dre">("dashboard");
  const [dreDays, setDreDays] = useState(30);
  const [taxRate, setTaxRate] = useState(6);
  const [dre, setDre] = useState<DreResponse | null>(null);
  const [dreLoading, setDreLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<InfinitepayReport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [filterType, setFilterType] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [analyzingBatch, setAnalyzingBatch] = useState<string | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Partial<ApiEntry> | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [{ data: sumData }, { data: entData }, { data: batData }] = await Promise.all([
        http.get<SummaryData>("/cashflow/summary"),
        http.get<{ items: ApiEntry[] }>("/cashflow", { params: { limit: 100 } }),
        http.get<BatchInfo[]>("/cashflow/batches"),
      ]);
      setSummary(sumData);
      setEntries(entData.items ?? []);
      setBatches(batData ?? []);
    } catch {
      // ignore — no data yet
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    if (tab !== "dre") return;
    const { from, to } = rangeIso(dreDays);
    setDreLoading(true);
    fetchDre(from, to, taxRate)
      .then(setDre)
      .catch(() => setDre(null))
      .finally(() => setDreLoading(false));
  }, [tab, dreDays, taxRate]);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setImportMsg(null);
    try {
      const { parseInfinitePayPdf } = await import("@/lib/infinitepay/parser");
      const report = await parseInfinitePayPdf(file);
      setPreview(report);
    } catch (e) {
      setImportMsg(
        language === "en"
          ? "Error reading PDF. Verify it is a valid InfinitePay report."
          : "Erro ao ler o PDF. Verifique se é um relatório válido da InfinitePay."
      );
      console.error(e);
    } finally {
      setParsing(false);
    }
  }, [language]);

  const handleImport = useCallback(
    async (analyzeWithAi: boolean, selectedTxs: ParsedTransaction[]) => {
      if (!preview || selectedTxs.length === 0) return;
      setImporting(true);
      try {
        const { data } = await http.post<{ importBatch: string; count: number }>("/cashflow/import", {
          transactions: selectedTxs,
          periodFrom: preview.periodFrom,
          periodTo: preview.periodTo,
          source: "infinitepay",
          analyzeWithAi,
        });
        setImportMsg(
          language === "en"
            ? `✅ ${data.count} transactions imported!${analyzeWithAi ? " AI is analyzing in the background." : ""}`
            : `✅ ${data.count} transações importadas!${analyzeWithAi ? " A IA está analisando em segundo plano." : ""}`
        );
        setPreview(null);
        await loadData();
      } catch {
        setImportMsg(
          language === "en"
            ? "Error importing. Try again."
            : "Erro ao importar. Tente novamente."
        );
      } finally {
        setImporting(false);
      }
    },
    [preview, loadData, language],
  );

  const handleDeleteBatch = useCallback(
    async (batchId: string) => {
      showConfirmToast({
        message: language === "en" ? "Remove this import batch?" : "Remover este lote importado?",
        confirmText: language === "en" ? "Remove" : "Remover",
        onConfirm: async () => {
          try {
            await http.delete(`/cashflow/batches/${batchId}`);
            toast.success(language === "en" ? "Batch removed" : "Lote removido");
            await loadData();
          } catch {
            toast.error(language === "en" ? "Error removing batch" : "Erro ao remover lote");
          }
        }
      });
    },
    [loadData, language],
  );

  const handleAnalyzeBatch = useCallback(
    async (batchId: string) => {
      setAnalyzingBatch(batchId);
      await http.post(`/cashflow/batches/${batchId}/analyze`);
      setAnalyzingBatch(null);
      setImportMsg(
        language === "en"
          ? "✨ AI analysis started in the background!"
          : "✨ Análise com IA iniciada em segundo plano!"
      );
    },
    [language],
  );

  const handleSaveEntry = async (data: Partial<ApiEntry>) => {
    try {
      if (editingEntry?._id) {
        await http.patch(`/cashflow/${editingEntry._id}`, data);
      } else {
        await http.post("/cashflow", data);
      }
      await loadData();
    } catch {
      toast.error(language === "en" ? "Error saving entry" : "Erro ao salvar lançamento");
    }
  };

  const handleRemoveEntry = async (id: string) => {
    showConfirmToast({
      message: language === "en" ? "Remove this entry?" : "Remover este lançamento?",
      confirmText: language === "en" ? "Remove" : "Remover",
      onConfirm: async () => {
        try {
          await http.delete(`/cashflow/${id}`);
          toast.success(language === "en" ? "Entry removed" : "Lançamento removido");
          await loadData();
        } catch {
          toast.error(language === "en" ? "Error removing entry" : "Erro ao remover lançamento");
        }
      }
    });
  };

  const filteredEntries = filterType
    ? entries.filter((e) => e.type === filterType)
    : entries;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
            {language === "en" ? "Financial" : "Financeiro"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" ? "InfinitePay Movements · Batch history and AI analysis" : "Movimentações InfinitePay · Histórico e análise com IA"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEntry(null);
            setManualEntryOpen(true);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          {language === "en" ? "+ Manual Entry" : "+ Lançamento Manual"}
        </button>
      </div>

      {/* Upload Zone */}
      {parsing ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: lmfitTokens.border }}>
          <div className="animate-pulse text-2xl mb-2">📊</div>
          <p style={{ color: lmfitTokens.textMuted }}>Reading PDF…</p>
        </div>
      ) : (
        <UploadZone onFile={handleFile} />
      )}

      {importMsg && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: importMsg.startsWith("✅") || importMsg.startsWith("✨")
              ? "#d1fae5"
              : "#fee2e2",
            color: importMsg.startsWith("✅") || importMsg.startsWith("✨")
              ? "#065f46"
              : "#991b1b",
          }}
        >
          {importMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: lmfitTokens.border }}>
        {(["dashboard", "history", "dre"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t ? lmfitTokens.primary : "transparent",
              color: tab === t ? lmfitTokens.primary : lmfitTokens.textMuted,
            }}
          >
            {t === "dashboard" ? (language === "en" ? "📊 Dashboard" : "📊 Início")
              : t === "history" ? (language === "en" ? "📋 Batch History" : "📋 Histórico de Lotes")
              : "📈 Resultado (DRE)"}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {loadingData ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "Loading…" : "Carregando…"}
            </p>
          ) : !summary || summary.count === 0 ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en"
                ? "No transactions imported yet. Drag a PDF above to start."
                : "Nenhuma transação importada ainda. Arraste um PDF acima para começar."}
            </p>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: language === "en" ? "Total Incomes" : "Entradas Totais", value: formatBRL(summary.totalIn), color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
                  { label: language === "en" ? "Total Expenses" : "Saídas Totais", value: formatBRL(summary.totalOut), color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
                  { label: language === "en" ? "Balance" : "Saldo", value: formatBRL(summary.balance), color: summary.balance >= 0 ? "#10b981" : "#ef4444", bg: "var(--chart-track)" },
                  { label: language === "en" ? "Card Sales" : "Vendas Cartão", value: formatBRL(summary.salesIn), color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border p-4" style={{ borderColor: lmfitTokens.border, backgroundColor: kpi.bg }}>
                    <p className="text-xs mb-1" style={{ color: kpi.color + "99" }}>{kpi.label}</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Daily Chart */}
              {summary.daily.length > 0 && (
                <div className="rounded-xl border p-5 bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
                  <h2 className="text-sm font-medium mb-4" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Daily Movement" : "Movimentação Diária"}
                  </h2>
                  <DailyChart data={summary.daily} lang={language} />
                </div>
              )}

              {/* Transaction table */}
              <div className="rounded-xl border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
                <div className="flex items-center justify-between p-4 border-b gap-3" style={{ borderColor: lmfitTokens.border }}>
                  <h2 className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Transactions" : "Transações"}
                  </h2>
                  <select
                    className="border rounded-lg px-3 py-1.5 text-sm"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">{language === "en" ? "All types" : "Todos os tipos"}</option>
                    <option value="deposit_sales">{language === "en" ? "Card Sale" : "Venda Cartão"}</option>
                    <option value="pix_received">{language === "en" ? "Pix Received" : "Pix Recebido"}</option>
                    <option value="pix_sent">{language === "en" ? "Pix Sent" : "Pix Enviado"}</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs border-b" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
                        <th className="py-2 px-4">{language === "en" ? "Date" : "Data"}</th>
                        <th className="py-2 px-2">{language === "en" ? "Type" : "Tipo"}</th>
                        <th className="py-2 px-2">{language === "en" ? "Name" : "Nome"}</th>
                        <th className="py-2 px-2">{language === "en" ? "AI" : "IA"}</th>
                        <th className="py-2 px-4 text-right">{language === "en" ? "Value" : "Valor"}</th>
                        <th className="py-2 px-4 text-right">{language === "en" ? "Actions" : "Ações"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry._id} className="border-b hover:bg-[var(--hover-bg)] transition-colors" style={{ borderColor: lmfitTokens.border }}>
                          <td className="py-2.5 px-4 tabular-nums whitespace-nowrap text-xs" style={{ color: lmfitTokens.textMuted }}>
                            {new Date(entry.date).toLocaleDateString(language === "en" ? "en-US" : "pt-BR", { timeZone: "UTC" })} {entry.hour}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={txTypeBadgeStyle(entry.type)}>
                              {txTypeLabel(entry.type, language)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 max-w-[180px] truncate" style={{ color: lmfitTokens.text }}>
                            {entry.name}
                          </td>
                          <td className="py-2.5 px-2 text-xs max-w-[160px]" style={{ color: lmfitTokens.textMuted }}>
                            {entry.aiAnalysis ? (
                              <span title={entry.aiAnalysis.notes}>
                                {entry.aiAnalysis.category}
                                {entry.aiAnalysis.entityType && (
                                  <span className="block mt-0.5 text-[9px] text-gray-500 uppercase tracking-wide">
                                    {entry.aiAnalysis.entityType.replace('_', ' ')}
                                  </span>
                                )}
                                <span className="block text-[10px]" style={{ color: entry.aiAnalysis.confidence && entry.aiAnalysis.confidence > 0.7 ? "#065f46" : "#6b7280" }}>
                                  ({Math.round((entry.aiAnalysis.confidence ?? 0) * 100)}%)
                                </span>
                              </span>
                            ) : (
                              <span className="text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums font-medium" style={{ color: getRawNumber(entry.amount) >= 0 ? "#065f46" : "#991b1b" }}>
                            {getRawNumber(entry.amount) >= 0 ? "+" : ""}{formatBRL(entry.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingEntry(entry);
                                setManualEntryOpen(true);
                              }}
                              className="text-xs px-2 py-1 mr-2 rounded border transition-colors"
                              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            >
                              {language === "en" ? "Edit" : "Editar"}
                            </button>
                            <button
                              onClick={() => void handleRemoveEntry(entry._id)}
                              className="text-xs px-2 py-1 rounded border transition-colors"
                              style={{ borderColor: "#fecaca", color: "#dc2626" }}
                            >
                              {language === "en" ? "Delete" : "Excluir"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "No batches imported." : "Nenhum lote importado."}
            </p>
          ) : (
            batches.map((b) => (
              <div key={b._id} className="rounded-xl border bg-[var(--card-bg)] p-4 flex flex-wrap items-center gap-4" style={{ borderColor: lmfitTokens.border }}>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-medium" style={{ color: lmfitTokens.textMuted }}>
                    {b.source.toUpperCase()} · {b.count} {language === "en" ? "transactions" : "transações"}
                  </p>
                  <p className="text-sm" style={{ color: lmfitTokens.text }}>
                    {b.periodFrom ? new Date(b.periodFrom).toLocaleDateString(language === "en" ? "en-US" : "pt-BR", { timeZone: "UTC" }) : "?"} →{" "}
                    {b.periodTo ? new Date(b.periodTo).toLocaleDateString(language === "en" ? "en-US" : "pt-BR", { timeZone: "UTC" }) : "?"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en" ? "Imported on" : "Importado em"} {new Date(b.importedAt).toLocaleString(language === "en" ? "en-US" : "pt-BR")}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span style={{ color: "#065f46" }}>+{formatBRL(b.totalIn)}</span>
                  <span style={{ color: "#991b1b" }}>-{formatBRL(b.totalOut)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleAnalyzeBatch(b._id)}
                    disabled={analyzingBatch === b._id}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                    style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
                  >
                    {analyzingBatch === b._id ? "Analyzing…" : "✨ AI Analyze"}
                  </button>
                  <button
                    onClick={() => void handleDeleteBatch(b._id)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium"
                    style={{ borderColor: "#fecaca", color: "#dc2626" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DRE Tab */}
      {tab === "dre" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex flex-col text-xs gap-1" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "Period" : "Período"}
              <select value={dreDays} onChange={e => setDreDays(Number(e.target.value))}
                className="border rounded-md px-3 py-2 text-sm bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
                {[7, 30, 90, 365].map(d => (
                  <option key={d} value={d}>
                    {language === "en" ? `Last ${d} days` : `Últimos {d} dias`.replace("{d}", String(d))}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs gap-1" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "Tax Rate (Simples Nacional) %" : "Imposto (Simples Nacional) %"}
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} step={0.1} value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-24 border rounded-md px-3 py-2 text-sm bg-[var(--card-bg)]"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }} />
                <span className="text-sm" style={{ color: lmfitTokens.textMuted }}>%</span>
              </div>
            </label>
          </div>

          {dreLoading ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "Loading DRE..." : "Carregando DRE…"}
            </p>
          ) : !dre ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en"
                ? "No data for the period. Register production batches and sales."
                : "Sem dados para o período. Cadastre lotes de produção e vendas."}
            </p>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    label: language === "en" ? "Gross Revenue" : "Faturamento Bruto",
                    value: dre.revenue.grossRevenue,
                    sub: language === "en" ? `${dre.revenue.orderCount} orders` : `${dre.revenue.orderCount} pedidos`,
                    color: "#3b82f6"
                  },
                  {
                    label: language === "en" ? "Net Revenue" : "Receita Líquida",
                    value: dre.revenue.netRevenue,
                    sub: language === "en" ? `Returns: R$ ${dre.revenue.returns.toFixed(2)}` : `Devol: R$ ${dre.revenue.returns.toFixed(2)}`,
                    color: lmfitTokens.primary
                  },
                  {
                    label: language === "en" ? "COGS (Production Cost)" : "CMV (Custo de Produção)",
                    value: dre.cmv.total,
                    sub: language === "en"
                      ? `${dre.cmv.batchCount} batches · ${dre.cmv.producedUnits} pcs`
                      : `${dre.cmv.batchCount} lotes · ${dre.cmv.producedUnits} pç`,
                    color: "#f59e0b"
                  },
                  {
                    label: language === "en" ? "Gross Profit" : "Lucro Bruto",
                    value: dre.grossProfit,
                    sub: language === "en" ? `Margin: ${dre.grossMarginPercent.toFixed(1)}%` : `Margem: ${dre.grossMarginPercent.toFixed(1)}%`,
                    color: dre.grossProfit >= 0 ? "#10b981" : "#ef4444"
                  },
                  {
                    label: language === "en" ? "Net Profit" : "Lucro Líquido",
                    value: dre.netProfit,
                    sub: language === "en" ? `Margin: ${dre.netMarginPercent.toFixed(1)}%` : `Margem: ${dre.netMarginPercent.toFixed(1)}%`,
                    color: dre.netProfit >= 0 ? "#10b981" : "#ef4444"
                  },
                  {
                    label: language === "en" ? "Average Cost/Piece" : "Custo Médio/Peça",
                    value: dre.cmv.avgCostPerUnit,
                    sub: language === "en" ? `${dre.cmv.producedUnits} pieces produced` : `${dre.cmv.producedUnits} peças produzidas`,
                    color: "#8b5cf6"
                  },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border p-4" style={{ borderColor: lmfitTokens.border, backgroundColor: k.color + "11" }}>
                    <p className="text-xs mb-1" style={{ color: k.color + "cc" }}>{k.label}</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>
                      {k.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* DRE Table */}
              <div className="rounded-xl border bg-[var(--card-bg)] overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
                <div className="p-4 border-b" style={{ borderColor: lmfitTokens.border }}>
                  <h2 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Simplified Income Statement" : "DRE Simplificado"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en" ? "Simplified Income Statement for the period" : "Demonstrativo de Resultado do Exercício"}
                  </p>
                </div>
                <div className="p-4 space-y-1.5">
                  {[
                    { label: language === "en" ? "(+) Gross Revenue" : "(+) Faturamento Bruto", value: dre.revenue.grossRevenue, style: "normal" },
                    { label: language === "en" ? "(–) Returns / Cancellations" : "(–) Devoluções / Cancelamentos", value: -dre.revenue.returns, style: "deduction" },
                    { label: language === "en" ? "= Net Revenue" : "= Receita Líquida", value: dre.revenue.netRevenue, style: "subtotal" },
                    { label: language === "en" ? "(–) COGS — Cost of Goods Sold" : "(–) CMV — Custo de Mercadoria Vendida", value: -dre.cmv.total, style: "deduction" },
                    { label: language === "en" ? "= Gross Profit" : "= Lucro Bruto", value: dre.grossProfit, style: "subtotal" },
                    { label: language === "en" ? "    Gross Margin" : "    Margem Bruta", value: undefined, extra: `${dre.grossMarginPercent.toFixed(1)}%`, style: "percent" },
                    { label: language === "en" ? "(–) Operating Expenses" : "(–) Despesas Operacionais", value: -dre.operationalExpenses, style: "deduction" },
                    { label: language === "en" ? "= EBITDA" : "= EBITDA", value: dre.ebitda, style: "subtotal" },
                    { label: language === "en" ? `(–) Taxes (Simples ${dre.taxRatePercent}%)` : `(–) Impostos (Simples ${dre.taxRatePercent}%)`, value: -dre.taxes, style: "deduction" },
                    { label: language === "en" ? "= Net Profit" : "= Lucro Líquido", value: dre.netProfit, style: "result" },
                    { label: language === "en" ? "    Net Margin" : "    Margem Líquida", value: undefined, extra: `${dre.netMarginPercent.toFixed(1)}%`, style: "percent" },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center py-1.5 ${
                      row.style === "subtotal" || row.style === "result" ? "border-t border-b" : ""
                    }`} style={{
                      borderColor: lmfitTokens.border,
                      backgroundColor: row.style === "result" ? lmfitTokens.primary + "11" : undefined,
                      borderRadius: row.style === "result" ? "0.5rem" : undefined,
                      padding: row.style === "result" ? "0.5rem 0.75rem" : undefined,
                    }}>
                      <span className={`text-sm ${
                        row.style === "result" ? "font-bold" : row.style === "subtotal" ? "font-semibold" : "font-normal"
                      }`} style={{ color: row.style === "percent" ? lmfitTokens.textMuted : lmfitTokens.text }}>
                        {row.label}
                      </span>
                      {row.extra !== undefined ? (
                        <span className="text-sm font-semibold tabular-nums" style={{ color: lmfitTokens.textMuted }}>{row.extra}</span>
                      ) : (
                        <span className={`text-sm tabular-nums ${
                          row.style === "result" || row.style === "subtotal" ? "font-bold" : "font-normal"
                        }`} style={{
                          color: (row.value ?? 0) >= 0
                            ? (row.style === "result" ? lmfitTokens.primary : lmfitTokens.text)
                            : "#ef4444",
                        }}>
                          {(row.value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          report={preview}
          onConfirm={handleImport}
          onCancel={() => setPreview(null)}
          loading={importing}
          lang={language}
        />
      )}

      {/* Manual Entry Modal */}
      {manualEntryOpen && (
        <ManualEntryModal
          entry={editingEntry}
          onClose={() => {
            setManualEntryOpen(false);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
          lang={language}
        />
      )}
    </div>
  );
}
