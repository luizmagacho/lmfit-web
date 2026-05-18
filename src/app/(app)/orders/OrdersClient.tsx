"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { http } from "@/lib/http";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { formatBRL } from "@/lib/formatMoney";
import { slugifyFileBase } from "@/lib/slugifyFileBase";
import { orderChannelLabel, ORDER_CHANNELS } from "@/lib/orders/orderChannel";
import type { OrderChannel, OrderWithWarnings } from "@/lib/orders/types";
import { orderStatusLabel } from "@/lib/orders/orderStatus";
import { listOrders, updateOrder, ordersExportParams } from "@/lib/orders/ordersApi";
import { OrdersKanban } from "./OrdersKanban";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";

export function OrdersClient() {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<OrderChannel | "">("");
  const [rows, setRows] = useState<OrderWithWarnings[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [customerById, setCustomerById] = useState<Record<string, string>>({});
  const [view, setView] = useState<"list" | "kanban">("list");

  const limit = 20;

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrder(id, { status });
      setRows((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
    } catch {
      alert("Erro ao atualizar status");
    }
  };

  const loadCustomers = useCallback(async () => {
    try {
      const { data } = await http.get<unknown>("/customers", { params: { page: 1, limit: 500 } });
      const items = extractListItems(data);
      const map: Record<string, string> = {};
      for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;
        const c = raw as Record<string, unknown>;
        const id = documentId(c);
        if (!id) continue;
        const name = c.name != null ? String(c.name) : "";
        map[id] = name.trim() ? name : id;
      }
      setCustomerById(map);
    } catch {
      setCustomerById({});
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const data = await listOrders({
          page,
          limit,
          search: search.trim() || undefined,
          channel: channel || undefined,
        });
        if (!cancelled) {
          setRows(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setErr("Não foi possível carregar os pedidos.");
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
  }, [page, search, channel]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function exportExcel() {
    try {
      const res = await http.get("/orders/export", {
        responseType: "blob",
        params: ordersExportParams({ search: search.trim() || undefined, channel }),
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
        a.download = `${slugifyFileBase("pedidos")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) {
        setErr("Exportação no servidor indisponível.");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          Pedidos
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
            href="/orders/new"
            className="text-sm min-h-11 inline-flex items-center px-3 rounded-md font-medium text-white touch-manipulation"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            Novo pedido
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="block text-sm space-y-1 min-w-[12rem] flex-1">
          <span style={{ color: lmfitTokens.textMuted }}>Buscar</span>
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Referência, cliente…"
          />
        </label>
        <label className="block text-sm space-y-1 w-full sm:w-48">
          <span style={{ color: lmfitTokens.textMuted }}>Canal</span>
          <select
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as OrderChannel | "");
              setPage(1);
            }}
          >
            <option value="">{t("filter.all", "Todos")}</option>
            {ORDER_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {t(`channel.${c.value}`, c.label)}
              </option>
            ))}
          </select>
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
        <OrdersKanban
          orders={rows}
          customers={customerById}
          onUpdateStatus={handleUpdateStatus}
          lang={language}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                <th className="px-3 py-2 font-medium w-16 hidden md:table-cell" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.id", "ID")}
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.reference", "Referência")}
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.customer", "Cliente")}
                </th>
                <th className="px-3 py-2 font-medium hidden md:table-cell" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.channel", "Canal")}
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.status", "Status")}
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.total", "Total")}
                </th>
                <th className="px-3 py-2 font-medium hidden md:table-cell" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.date", "Data")}
                </th>
                <th className="px-3 py-2 font-medium w-28" style={{ color: lmfitTokens.accentBlue }}>
                  {t("orders.actions", "Ações")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center" style={{ color: lmfitTokens.textMuted }}>
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, rowIdx) => {
                const id = String(row._id ?? "");
                const cid = row.customerId ? String(row.customerId) : "";
                const created = row.createdAt ? new Date(String(row.createdAt)) : null;
                return (
                  <tr key={id || `row-${rowIdx}`} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <td className="px-3 py-2 align-top font-medium tabular-nums hidden md:table-cell" style={{ color: lmfitTokens.text }}>
                      #{row.number ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {row.reference != null && String(row.reference) !== "" ? String(row.reference) : "—"}
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {cid ? customerById[cid] ?? cid : "—"}
                    </td>
                    <td className="px-3 py-2 align-top hidden md:table-cell" style={{ color: lmfitTokens.text }}>
                      {t(`channel.${row.channel}`, orderChannelLabel(row.channel as string))}
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: lmfitTokens.text }}>
                      {t(`status.${row.status}`, orderStatusLabel(row.status as string))}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums" style={{ color: lmfitTokens.text }}>
                      {typeof row.total === "number" && Number.isFinite(row.total) ? formatBRL(row.total) : "—"}
                    </td>
                    <td className="px-3 py-2 align-top hidden md:table-cell" style={{ color: lmfitTokens.textMuted }}>
                      {created && !Number.isNaN(created.getTime())
                        ? created.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {id ? (
                        <Link
                          href={`/orders/${encodeURIComponent(id)}`}
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
