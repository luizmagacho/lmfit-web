"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { http } from "@/lib/http";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";
import type { InfinitepayReport, ParsedTransaction } from "@/lib/infinitepay/types";

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
                title={`Incomes: ${formatBRL(d.in)}`}
              />
              <div
                className="flex-1 rounded-sm transition-all shadow-sm"
                style={{
                  height: maxVal ? `${Math.round((d.out / maxVal) * 100)}%` : "0%",
                  backgroundColor: "#ef4444",
                  minHeight: d.out > 0 ? 3 : 0,
                }}
                title={`Expenses: ${formatBRL(d.out)}`}
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
        Drag and drop InfinitePay PDF here
      </p>
      <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
        or click to select file
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
}: {
  report: InfinitepayReport;
  onConfirm: (analyzeAi: boolean, selectedTxs: ParsedTransaction[]) => void;
  onCancel: () => void;
  loading: boolean;
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
              Statement Preview
            </h2>
            <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
              {report.companyName} · {report.periodFrom} → {report.periodTo}
            </p>
          </div>
          <button onClick={onCancel} className="text-xl leading-none px-2" style={{ color: lmfitTokens.textMuted }}>×</button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6 border-b" style={{ borderColor: lmfitTokens.border }}>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>Incomes</p>
            <p className="text-lg font-bold" style={{ color: "#065f46" }}>{formatBRL(totalIn)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>Expenses</p>
            <p className="text-lg font-bold" style={{ color: "#991b1b" }}>{formatBRL(totalOut)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: lmfitTokens.textMuted }}>Balance</p>
            <p className="text-lg font-bold" style={{ color: lmfitTokens.text }}>{formatBRL(balance)}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <p className="text-xs mb-2" style={{ color: lmfitTokens.textMuted }}>
            {selected.size} of {report.transactions.length} transactions selected
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
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">Name</th>
                <th className="py-1 text-right">Value</th>
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
                      {txTypeLabel(tx.type)}
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
            Cancel
          </button>
          <button
            onClick={() => onConfirm(false, selectedTxs)}
            disabled={loading || selected.size === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
            style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
          >
            {loading ? "Importing…" : "Import"}
          </button>
          <button
            onClick={() => onConfirm(true, selectedTxs)}
            disabled={loading || selected.size === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {loading ? "Importing…" : "✨ Import + AI Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialClient() {
  const { language } = useLanguage();
  const [tab, setTab] = useState<"dashboard" | "history">("dashboard");
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

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setImportMsg(null);
    try {
      const { parseInfinitePayPdf } = await import("@/lib/infinitepay/parser");
      const report = await parseInfinitePayPdf(file);
      setPreview(report);
    } catch (e) {
      setImportMsg("Error reading PDF. Verify it is a valid InfinitePay report.");
      console.error(e);
    } finally {
      setParsing(false);
    }
  }, []);

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
          `✅ ${data.count} transactions imported!${analyzeWithAi ? " AI is analyzing in the background." : ""}`,
        );
        setPreview(null);
        await loadData();
      } catch {
        setImportMsg("Error importing. Try again.");
      } finally {
        setImporting(false);
      }
    },
    [preview, loadData],
  );

  const handleDeleteBatch = useCallback(
    async (batchId: string) => {
      if (!confirm("Remove this import batch?")) return;
      await http.delete(`/cashflow/batches/${batchId}`);
      await loadData();
    },
    [loadData],
  );

  const handleAnalyzeBatch = useCallback(
    async (batchId: string) => {
      setAnalyzingBatch(batchId);
      await http.post(`/cashflow/batches/${batchId}/analyze`);
      setAnalyzingBatch(null);
      setImportMsg("✨ AI analysis started in the background!");
    },
    [],
  );

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
        {(["dashboard", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t ? lmfitTokens.primary : "transparent",
              color: tab === t ? lmfitTokens.primary : lmfitTokens.textMuted,
            }}
          >
            {t === "dashboard" ? (language === "en" ? "📊 Dashboard" : "📊 Início") : (language === "en" ? "📋 Batch History" : "📋 Histórico de Lotes")}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {loadingData ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>Loading…</p>
          ) : !summary || summary.count === 0 ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              No transactions imported yet. Drag a PDF above to start.
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
                  <h2 className="text-sm font-medium" style={{ color: lmfitTokens.text }}>Transactions</h2>
                  <select
                    className="border rounded-lg px-3 py-1.5 text-sm"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All types</option>
                    <option value="deposit_sales">Card Sale</option>
                    <option value="pix_received">Pix Received</option>
                    <option value="pix_sent">Pix Sent</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs border-b" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
                        <th className="py-2 px-4">Date</th>
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Name</th>
                        <th className="py-2 px-2">AI</th>
                        <th className="py-2 px-4 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry._id} className="border-b hover:bg-[var(--hover-bg)] transition-colors" style={{ borderColor: lmfitTokens.border }}>
                          <td className="py-2.5 px-4 tabular-nums whitespace-nowrap text-xs" style={{ color: lmfitTokens.textMuted }}>
                            {new Date(entry.date).toLocaleDateString(language === "en" ? "en-US" : "pt-BR", { timeZone: "UTC" })} {entry.hour}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium" style={txTypeBadgeStyle(entry.type)}>
                              {txTypeLabel(entry.type)}
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
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>No batches imported.</p>
          ) : (
            batches.map((b) => (
              <div key={b._id} className="rounded-xl border bg-[var(--card-bg)] p-4 flex flex-wrap items-center gap-4" style={{ borderColor: lmfitTokens.border }}>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-medium" style={{ color: lmfitTokens.textMuted }}>
                    {b.source.toUpperCase()} · {b.count} transactions
                  </p>
                  <p className="text-sm" style={{ color: lmfitTokens.text }}>
                    {b.periodFrom ? new Date(b.periodFrom).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "?"} →{" "}
                    {b.periodTo ? new Date(b.periodTo).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "?"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    Imported on {new Date(b.importedAt).toLocaleString("pt-BR")}
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

      {/* Preview Modal */}
      {preview && (
        <PreviewModal
          report={preview}
          onConfirm={handleImport}
          onCancel={() => setPreview(null)}
          loading={importing}
        />
      )}
    </div>
  );
}
