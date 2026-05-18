"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBRL } from "@/lib/formatMoney";
import { slugifyFileBase } from "@/lib/slugifyFileBase";
import { http } from "@/lib/http";
import { listPurchases } from "@/lib/purchases/purchasesApi";
import type { PurchaseRecord } from "@/lib/purchases/types";
import { lmfitTokens } from "@/theme/tokens";
import { PurchasesKanban } from "./PurchasesKanban";
import { useLanguage } from "@/context/LanguageContext";

type SupplierRow = { _id: string; name?: string };

export function PurchasesListClient() {
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PurchaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [supplierById, setSupplierById] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "kanban">("list");

  const limit = 20;

  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await http.get<{ items: SupplierRow[] }>("/suppliers", { params: { page: 1, limit: 100 } });
      const map: Record<string, string> = {};
      for (const s of data.items ?? []) {
        map[s._id] = s.name?.trim() ? s.name : s._id;
      }
      setSupplierById(map);
    } catch {
      setSupplierById({});
    }
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const data = await listPurchases({ page, limit, search: search.trim() || undefined });
        if (!cancelled) {
          setRows(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setErr("Não foi possível carregar as compras.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function exportExcel() {
    try {
      const res = await http.get("/purchases/export", {
        responseType: "blob",
        params: { format: "xlsx", ...(search.trim() ? { search: search.trim() } : {}) },
      });
      const blob = res.data as Blob;
      const ct = (res.headers["content-type"] ?? "").toLowerCase();
      const looksLikeSheet =
        ct.includes("spreadsheetml") ||
        ct.includes("ms-excel") ||
        (ct.includes("octet-stream") && blob.size > 64);
      if (looksLikeSheet && !ct.includes("text/html") && !ct.includes("application/json")) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slugifyFileBase("compras")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setErr("Exportação indisponível.");
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await http.patch(`/purchases/${id}`, { status });
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
    } catch {
      alert("Erro ao atualizar status");
    }
  };

  const translateStatus = (st: string) => {
    if (!st) return "—";
    const map: Record<string, { pt: string; en: string }> = {
      pending: { pt: "Pendente", en: "Pending" },
      interest: { pt: "Interesse", en: "Interest" },
      order_reserved: { pt: "Reserva de Pedido", en: "Order Reserved" },
      in_transit: { pt: "Em Trânsito", en: "In Transit" },
      received: { pt: "Recebido", en: "Received" },
      cancelled: { pt: "Cancelado", en: "Cancelled" },
    };
    return map[st] ? (language === "en" ? map[st].en : map[st].pt) : st;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          Compras
        </h1>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            {loading ? "…" : `${total} registro(s)`}
          </span>
          <button
            type="button"
            className="text-sm min-h-11 px-3 rounded-md border touch-manipulation"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            onClick={() => void exportExcel()}
          >
            Exportar Excel
          </button>
          <Link
            href="/purchases/new"
            className="text-sm min-h-11 inline-flex items-center px-3 rounded-md font-medium text-white touch-manipulation"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            Nova compra
          </Link>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <label className="block text-sm space-y-1 flex-1 max-w-md">
          <span style={{ color: lmfitTokens.textMuted }}>Buscar</span>
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Referência, fornecedor…"
          />
        </label>
        <div className="flex items-end">
          <div className="flex p-1 rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
            <button
              onClick={() => setView("list")}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: view === "list" ? "rgba(0,0,0,0.05)" : "transparent",
                color: view === "list" ? lmfitTokens.text : lmfitTokens.textMuted,
              }}
            >
              Lista
            </button>
            <button
              onClick={() => setView("kanban")}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
              style={{
                backgroundColor: view === "kanban" ? "rgba(0,0,0,0.05)" : "transparent",
                color: view === "kanban" ? lmfitTokens.text : lmfitTokens.textMuted,
              }}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {err ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      ) : null}

      {view === "kanban" ? (
        <PurchasesKanban
          purchases={rows}
          suppliers={supplierById}
          onUpdateStatus={handleUpdateStatus}
          lang={language}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  Referência
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  Fornecedor
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  Status
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  Total
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  Linhas
                </th>
                <th className="px-3 py-2 font-medium w-28" style={{ color: lmfitTokens.accentBlue }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center" style={{ color: lmfitTokens.textMuted }}>
                    Nenhuma compra encontrada.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, rowIdx) => {
                const id = String(row._id ?? "");
                const sidRaw = row.supplierId;
                const sidStr = sidRaw && typeof sidRaw === 'object' && '_id' in sidRaw ? String((sidRaw as Record<string, unknown>)._id) : String(sidRaw ?? "");
                const supplierName = sidRaw && typeof sidRaw === 'object' && 'name' in sidRaw ? String((sidRaw as Record<string, unknown>).name) : (supplierById[sidStr] ?? sidStr);
                const lineCount = Array.isArray(row.lines) ? row.lines.length : 0;
                return (
                  <tr key={id || `row-${rowIdx}`} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {row.reference != null && String(row.reference) !== "" ? String(row.reference) : "—"}
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {supplierName || "—"}
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {translateStatus(row.status || "")}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums" style={{ color: lmfitTokens.text }}>
                      {typeof row.total === "number" && Number.isFinite(row.total) ? formatBRL(row.total) : "—"}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                      {lineCount}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {id ? (
                        <Link
                          href={`/purchases/${encodeURIComponent(id)}`}
                          className="text-xs min-h-9 inline-flex items-center px-2 rounded border touch-manipulation"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        >
                          Abrir
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: lmfitTokens.text }}>
          <button
            type="button"
            className="min-h-11 px-3 rounded-md border touch-manipulation disabled:opacity-40"
            style={{ borderColor: lmfitTokens.border }}
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span style={{ color: lmfitTokens.textMuted }}>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="min-h-11 px-3 rounded-md border touch-manipulation disabled:opacity-40"
            style={{ borderColor: lmfitTokens.border }}
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
