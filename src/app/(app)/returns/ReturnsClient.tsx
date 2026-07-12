"use client";

import { useState } from "react";
import { Loader2, PackageCheck, Repeat, Search } from "lucide-react";
import { ResourceList } from "@/components/ResourceList";
import { http } from "@/lib/http";
import { getOrder, listOrders } from "@/lib/orders/ordersApi";
import type { OrderWithWarnings } from "@/lib/orders/types";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

type ReturnableLine = {
  variantId: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  returnedQty: number;
};

function returnableLines(order: OrderWithWarnings): ReturnableLine[] {
  const raw = (order.lines ?? []) as Array<Record<string, unknown>>;
  return raw
    .filter((l) => !l.isOrder)
    .map((l) => ({
      variantId: String(l.variantId),
      description: (l.description as string | undefined) ?? undefined,
      quantity: Number(l.quantity ?? 0),
      unitPrice: Number(l.unitPrice ?? 0),
      returnedQty: Number(l.returnedQty ?? 0),
    }))
    .filter((l) => l.quantity - l.returnedQty > 0);
}

function NewReturnPanel({ onCreated }: { onCreated: () => void }) {
  const [orderQuery, setOrderQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OrderWithWarnings[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const [order, setOrder] = useState<OrderWithWarnings | null>(null);
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});
  const [type, setType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchErr(null);
    setOrder(null);
    const term = orderQuery.trim();
    if (!term) return;
    setSearching(true);
    try {
      const { items } = await listOrders({ search: term, limit: 8 });
      const returnable = items.filter((o) => o.status === "shipped" || o.status === "completed");
      setSearchResults(returnable);
      if (returnable.length === 0) {
        setSearchErr(
          items.length > 0
            ? "Pedido(s) encontrado(s), mas nenhum está enviado/concluído (só esses aceitam devolução)."
            : "Nenhum pedido encontrado.",
        );
      }
    } catch {
      setSearchErr("Erro ao buscar pedido.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectOrder(o: OrderWithWarnings) {
    setMessage(null);
    const full = await getOrder(o._id);
    setOrder(full);
    setQtyByVariant({});
  }

  function setQty(variantId: string, value: number, max: number) {
    setQtyByVariant((prev) => ({ ...prev, [variantId]: Math.max(0, Math.min(max, value)) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setMessage(null);
    const lines = Object.entries(qtyByVariant)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity, reason: reason || undefined }));
    if (!lines.length) {
      setMessage({ type: "error", text: "Informe a quantidade de ao menos um item." });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await http.post<{ creditIssued: number }>(`/orders/${order._id}/returns`, {
        type,
        lines,
        notes: notes || undefined,
      });
      setMessage({
        type: "success",
        text:
          type === "return"
            ? `Devolução registrada. Crédito de ${formatBRL(Number(data.creditIssued ?? 0))} lançado no cliente.`
            : "Troca registrada — venda a nova variante num pedido novo.",
      });
      setOrder(null);
      setOrderQuery("");
      setSearchResults([]);
      setQtyByVariant({});
      setReason("");
      setNotes("");
      onCreated();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Erro ao registrar." });
    } finally {
      setSubmitting(false);
    }
  }

  const lines = order ? returnableLines(order) : [];

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <Repeat className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Nova devolução ou troca
        </h2>
      </div>

      {!order ? (
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="Número ou referência do pedido"
            className="flex-1 min-h-10 border rounded px-3 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
          <button
            type="submit"
            disabled={searching || !orderQuery.trim()}
            className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </form>
      ) : null}

      {searchErr ? (
        <p className="text-xs" style={{ color: lmfitTokens.error }}>
          {searchErr}
        </p>
      ) : null}

      {!order && searchResults.length > 0 ? (
        <ul className="space-y-1">
          {searchResults.map((o) => (
            <li key={o._id}>
              <button
                type="button"
                onClick={() => void handleSelectOrder(o)}
                className="w-full text-left text-sm px-3 py-2 rounded border hover:opacity-80 transition-opacity flex items-center justify-between"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              >
                <span>
                  Pedido #{o.number ?? "—"} {o.reference ? `· ${o.reference}` : ""}
                </span>
                <span className="tabular-nums text-xs" style={{ color: lmfitTokens.textMuted }}>
                  {formatBRL(Number(o.total ?? 0))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {order ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
              Pedido #{order.number ?? "—"} {order.reference ? `· ${order.reference}` : ""}
            </p>
            <button
              type="button"
              onClick={() => setOrder(null)}
              className="text-xs underline"
              style={{ color: lmfitTokens.textMuted }}
            >
              Trocar pedido
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Nenhum item deste pedido está disponível para devolução (tudo já foi devolvido, ou são itens de encomenda).
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => {
                const available = l.quantity - l.returnedQty;
                const qty = qtyByVariant[l.variantId] ?? 0;
                return (
                  <div
                    key={l.variantId}
                    className="flex items-center justify-between gap-3 text-sm border-b pb-2"
                    style={{ borderColor: lmfitTokens.border }}
                  >
                    <div className="min-w-0">
                      <p className="truncate" style={{ color: lmfitTokens.text }}>
                        {l.description || l.variantId}
                      </p>
                      <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                        {formatBRL(l.unitPrice)} · disponível para devolução: {available}
                        {l.returnedQty > 0 ? ` (já devolvido: ${l.returnedQty})` : ""}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={available}
                      value={qty}
                      onChange={(e) => setQty(l.variantId, Math.floor(Number(e.target.value) || 0), available)}
                      className="w-20 min-h-9 border rounded px-2 py-1 text-sm bg-transparent text-right"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Tipo
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "return" | "exchange")}
                className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              >
                <option value="return">Devolução (gera crédito de loja)</option>
                <option value="exchange">Troca (sem crédito — venda a nova peça à parte)</option>
              </select>
            </label>
            <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Motivo
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: tamanho errado, defeito…"
                className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </label>
          </div>

          <label className="text-xs block" style={{ color: lmfitTokens.textMuted }}>
            Observações
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            {message ? (
              <p className="text-xs" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
                {message.text}
              </p>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={submitting || lines.length === 0}
              className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              Registrar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function ReturnsClient() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Devoluções e trocas
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Busque um pedido enviado ou concluído para devolver ou trocar itens. O estoque volta
          automaticamente; devoluções também geram crédito de loja para o cliente.
        </p>
      </div>

      <NewReturnPanel onCreated={() => setReloadKey((n) => n + 1)} />

      <ResourceList
        key={reloadKey}
        title="Histórico"
        endpoint="/returns"
        crud={false}
        excel={false}
        columns={[
          { key: "_id", label: "ID", hiddenOnMobile: true },
          { key: "createdAt", label: "Data" },
          { key: "orderNumber", label: "Pedido" },
          { key: "customerName", label: "Cliente" },
          { key: "type", label: "Tipo" },
          { key: "creditIssued", label: "Crédito emitido" },
          { key: "notes", label: "Observações", hiddenOnMobile: true },
        ]}
        tableColumns={["createdAt", "orderNumber", "customerName", "type", "creditIssued", "notes"]}
        cellRender={{
          createdAt: (row) =>
            row.createdAt ? new Date(String(row.createdAt)).toLocaleString("pt-BR") : "—",
          type: (row) => (row.type === "return" ? "Devolução" : "Troca"),
          creditIssued: (row) => formatBRL(Number(row.creditIssued ?? 0)),
          orderNumber: (row) => (row.orderNumber ? `#${row.orderNumber}` : "—"),
        }}
      />
    </div>
  );
}
