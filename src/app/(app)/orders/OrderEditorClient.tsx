"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { OrderWarningsPanel } from "@/components/OrderWarningsPanel";
import { StockConflictPanel } from "@/components/StockConflictPanel";
import { axiosErrorMessage, getStockConflictsFromAxiosError } from "@/lib/apiErrors";
import { formatBRL } from "@/lib/formatMoney";
import { http } from "@/lib/http";
import {
  collectVariantOptionsFromProducts,
  documentId,
  extractListItems,
} from "@/lib/normalizeApiList";
import { DEFAULT_ORDER_CHANNEL, ORDER_CHANNELS } from "@/lib/orders/orderChannel";
import { normalizeOrderLines } from "@/lib/orders/normalizeLines";
import { createOrder, getOrder, updateOrder } from "@/lib/orders/ordersApi";
import { ORDER_STATUSES } from "@/lib/orders/orderStatus";
import type { OrderChannel, OrderLineInput, OrderStatus, OrderWarning, StockConflict } from "@/lib/orders/types";
import { isLinesLockedStatus } from "@/lib/orders/types";
import { lmfitTokens } from "@/theme/tokens";

type CustomerRow = { _id: string; name?: string };
type VariantOpt = { id: string; label: string; sku: string; price: number };

type LocalLine = {
  key: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  description: string;
};

function emptyLine(key: string): LocalLine {
  return { key, variantId: "", quantity: "1", unitPrice: "0", description: "" };
}

function linesToLocal(lines: OrderLineInput[], nextKey: () => string): LocalLine[] {
  if (!lines.length) return [emptyLine(nextKey())];
  return lines.map((l) => ({
    key: nextKey(),
    variantId: l.variantId,
    quantity: String(l.quantity),
    unitPrice: String(l.unitPrice),
    description: l.description ? String(l.description) : "",
  }));
}

function parseLinesPayload(rows: LocalLine[]): OrderLineInput[] | undefined {
  const out: OrderLineInput[] = [];
  for (const r of rows) {
    if (!r.variantId.trim()) continue;
    const quantity = Number(String(r.quantity).replace(",", "."));
    const unitPrice = Number(String(r.unitPrice).replace(",", "."));
    out.push({
      variantId: r.variantId.trim(),
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      description: r.description.trim() === "" ? null : r.description.trim(),
    });
  }
  return out;
}

function computeLineTotal(lines: OrderLineInput[]): number {
  return lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
}

export function OrderEditorClient({ orderId }: { orderId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVariantId = searchParams.get("variantId")?.trim() ?? "";
  const presetCustomerId = searchParams.get("customerId")?.trim() ?? "";

  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [variantOpts, setVariantOpts] = useState<VariantOpt[]>([]);
  const [customersLoadErr, setCustomersLoadErr] = useState<string | null>(null);
  const [catalogLoadErr, setCatalogLoadErr] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState<OrderChannel>(DEFAULT_ORDER_CHANNEL);
  const [status, setStatus] = useState<OrderStatus>("open");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const keyBase = useId();
  const keySeqRef = useRef(0);
  const nextKey = useCallback(() => {
    keySeqRef.current += 1;
    return `${keyBase}-line-${keySeqRef.current}`;
  }, [keyBase]);
  const [lines, setLines] = useState<LocalLine[]>(() => [emptyLine(`${keyBase}-line-0`)]);

  const [warnings, setWarnings] = useState<OrderWarning[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stockErr, setStockErr] = useState<{ message: string; conflicts?: StockConflict[] } | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const linesLocked = isLinesLockedStatus(status);

  const filteredVariants = useMemo(() => {
    const q = variantFilter.trim().toLowerCase();
    if (!q) return variantOpts;
    return variantOpts.filter((v) => v.label.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q));
  }, [variantOpts, variantFilter]);

  const variantById = useMemo(() => {
    const m = new Map<string, VariantOpt>();
    for (const v of variantOpts) m.set(v.id, v);
    return m;
  }, [variantOpts]);

  const previewLines = useMemo(() => parseLinesPayload(lines) ?? [], [lines]);
  const previewTotal = useMemo(() => computeLineTotal(previewLines), [previewLines]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoadErr(null);
    try {
      const { data } = await http.get<unknown>("/products", { params: { page: 1, limit: 100 } });
      const items = extractListItems(data);
      const rows = collectVariantOptionsFromProducts(items);
      setVariantOpts(
        rows.map((r) => ({
          id: r.id,
          sku: r.sku,
          price: r.price,
          label: r.label,
        })),
      );
    } catch (e) {
      setVariantOpts([]);
      setCatalogLoadErr(isAxiosError(e) ? axiosErrorMessage(e) : "Não foi possível carregar produtos.");
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoadErr(null);
    try {
      const { data } = await http.get<unknown>("/customers", { params: { page: 1, limit: 100 } });
      const items = extractListItems(data);
      setCustomers(
        items
          .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
          .map((row) => ({
            _id: documentId(row),
            name: row.name != null ? String(row.name) : undefined,
          }))
          .filter((c) => c._id),
      );
    } catch (e) {
      setCustomers([]);
      setCustomersLoadErr(isAxiosError(e) ? axiosErrorMessage(e) : "Não foi possível carregar clientes.");
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    void loadCustomers();
  }, [loadCatalog, loadCustomers]);

  useEffect(() => {
    if (!orderId) {
      if (presetCustomerId) setCustomerId(presetCustomerId);
      if (presetVariantId) {
        setLines([
          {
            key: nextKey(),
            variantId: presetVariantId,
            quantity: "1",
            unitPrice: "0",
            description: "",
          },
        ]);
      }
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    (async () => {
      try {
        const o = await getOrder(orderId);
        if (cancelled) return;
        setCustomerId(o.customerId ? String(o.customerId) : "");
        setChannel((o.channel as OrderChannel) || DEFAULT_ORDER_CHANNEL);
        setStatus((o.status as OrderStatus) || "open");
        setOrderNumber(o.number ?? null);
        setReference(o.reference != null ? String(o.reference) : "");
        setNotes(o.notes != null ? String(o.notes) : "");
        const normalized = normalizeOrderLines(o.lines);
        setLines(linesToLocal(normalized, nextKey));
        setWarnings(Array.isArray(o.warnings) ? o.warnings : []);
      } catch (e) {
        if (!cancelled) setLoadErr(axiosErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, presetVariantId, presetCustomerId, nextKey]);

  useEffect(() => {
    if (!presetVariantId || orderId || !variantOpts.length) return;
    setLines((prev) => {
      if (prev.length === 1 && prev[0].variantId === presetVariantId && Number(prev[0].unitPrice) === 0) {
        const v = variantOpts.find((x) => x.id === presetVariantId);
        if (!v) return prev;
        return [{ ...prev[0], unitPrice: String(v.price) }];
      }
      return prev;
    });
  }, [presetVariantId, orderId, variantOpts]);

  function onVariantPick(rowKey: string, variantId: string) {
    const v = variantById.get(variantId);
    setLines((prev) =>
      prev.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              variantId,
              unitPrice: v ? String(v.price) : row.unitPrice,
            }
          : row,
      ),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveErr(null);
    setStockErr(null);
    setSuccessMsg(null);

    if (!customerId.trim()) {
      setSaveErr("Selecione o cliente.");
      return;
    }

    const payloadLines = parseLinesPayload(lines);
    if (!orderId && (!payloadLines || payloadLines.length === 0)) {
      setSaveErr("Inclua ao menos uma linha com variante e quantidade.");
      return;
    }
    if (orderId && !linesLocked && (!payloadLines || payloadLines.length === 0)) {
      setSaveErr("Inclua ao menos uma linha com variante.");
      return;
    }

    setSaving(true);
    try {
      if (!orderId) {
        const created = await createOrder({
          customerId: customerId.trim(),
          channel,
          status,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          lines: payloadLines,
        });
        router.replace(`/orders/${encodeURIComponent(String(created._id))}`);
        return;
      }

      const body: Parameters<typeof updateOrder>[1] = {
        channel,
        status,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      };
      if (!linesLocked && payloadLines && payloadLines.length > 0) {
        body.lines = payloadLines;
        body.total = computeLineTotal(payloadLines);
      }

      const updated = await updateOrder(orderId, body);
      setWarnings(Array.isArray(updated.warnings) ? updated.warnings : []);
      setSuccessMsg("Alterações salvas.");
      if (updated.status) setStatus(updated.status as OrderStatus);
      if (!linesLocked && updated.lines) {
        setLines(linesToLocal(normalizeOrderLines(updated.lines), nextKey));
      }
    } catch (err) {
      const stock = getStockConflictsFromAxiosError(err);
      if (stock) {
        setStockErr(stock);
        return;
      }
      setSaveErr(isAxiosError(err) ? axiosErrorMessage(err) : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        Carregando…
      </p>
    );
  }

  if (loadErr) {
    return (
      <p className="text-sm" style={{ color: lmfitTokens.error }}>
        {loadErr}
      </p>
    );
  }

  const lockedDisplayLines = parseLinesPayload(lines) ?? [];

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          {orderId ? (orderNumber ? `Pedido #${orderNumber}` : "Editar pedido") : "Novo pedido"}
        </h1>
        <Link
          href={!orderId && presetCustomerId ? `/customers/${encodeURIComponent(presetCustomerId)}` : "/orders"}
          className="text-sm min-h-11 inline-flex items-center px-3 rounded-md border touch-manipulation"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          {!orderId && presetCustomerId ? "Voltar ao cliente" : "Voltar à lista"}
        </Link>
      </div>

      {successMsg ? (
        <p
          className="text-sm rounded-md border px-3 py-2"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.success, backgroundColor: lmfitTokens.warningBg }}
        >
          {successMsg}
        </p>
      ) : null}

      {customersLoadErr || catalogLoadErr ? (
        <div
          className="text-sm rounded-md border px-3 py-2 space-y-1"
          style={{ borderColor: lmfitTokens.error, color: lmfitTokens.error }}
          role="alert"
        >
          {customersLoadErr ? <p>Clientes: {customersLoadErr}</p> : null}
          {catalogLoadErr ? <p>Produtos e variantes: {catalogLoadErr}</p> : null}
        </div>
      ) : null}

      {!customersLoadErr && customers.length === 0 ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Nenhum cliente na lista. Cadastre em Clientes ou confira permissões da API.
        </p>
      ) : null}

      {!catalogLoadErr && variantOpts.length === 0 ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Nenhuma variante disponível. Produtos precisam de SKU e estoque no catálogo, ou linhas em{" "}
          <code className="text-xs">variants</code> na resposta de <code className="text-xs">GET /products</code>.
        </p>
      ) : null}

      {stockErr ? (
        <StockConflictPanel
          title={stockErr.message}
          conflicts={stockErr.conflicts}
          onDismiss={() => setStockErr(null)}
          onAdjustQuantities={() => {
            setStockErr(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      <OrderWarningsPanel warnings={warnings} />

      {saveErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {saveErr}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Cliente *</span>
          <select
            required
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={customerId}
            disabled={Boolean(orderId) || Boolean(presetCustomerId)}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name?.trim() ? `${c.name} (${c._id})` : c._id}
              </option>
            ))}
          </select>
          {orderId ? (
            <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              O cliente não pode ser alterado após a criação.
            </span>
          ) : presetCustomerId ? (
            <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Pré-selecionado a partir da ficha do cliente.
            </span>
          ) : null}
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Canal *</span>
          <select
            required
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={channel}
            onChange={(e) => setChannel(e.target.value as OrderChannel)}
          >
            {ORDER_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Status</span>
          <select
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Referência</span>
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Opcional"
          />
        </label>

        <label className="block text-sm space-y-1 sm:col-span-2">
          <span style={{ color: lmfitTokens.textMuted }}>Observações</span>
          <textarea
            className="w-full border rounded-md px-3 py-2 min-h-[4.5rem] bg-[var(--card-bg)] text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
            Linhas
          </h2>
          {linesLocked ? (
            <span
              className="text-xs max-w-md"
              style={{ color: lmfitTokens.textMuted }}
              title="Pedidos em separação ou concluídos não permitem alterar linhas."
            >
              Edição de linhas bloqueada: status em separação, enviado ou concluído.
            </span>
          ) : (
            <input
              type="search"
              className="text-sm min-h-9 max-w-xs border rounded-md px-2 py-1 flex-1"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder="Filtrar variantes (SKU, nome)…"
              value={variantFilter}
              onChange={(e) => setVariantFilter(e.target.value)}
            />
          )}
        </div>

        {linesLocked ? (
          <ReadOnlyLinesTable lines={lockedDisplayLines} variantById={variantById} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: lmfitTokens.border }}>
                    <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                      Variante
                    </th>
                    <th className="py-2 pr-2 font-medium w-28" style={{ color: lmfitTokens.accentBlue }}>
                      Qtd
                    </th>
                    <th className="py-2 pr-2 font-medium w-36" style={{ color: lmfitTokens.accentBlue }}>
                      Preço unit.
                    </th>
                    <th className="py-2 pr-2 font-medium min-w-[8rem]" style={{ color: lmfitTokens.accentBlue }}>
                      Descrição
                    </th>
                    <th className="py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row) => (
                    <tr key={row.key} className="border-b align-top" style={{ borderColor: lmfitTokens.border }}>
                      <td className="py-2 pr-2">
                        <select
                          className="w-full min-w-[12rem] border rounded-md px-2 py-2 min-h-11 bg-[var(--card-bg)]"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          value={row.variantId}
                          onChange={(e) => onVariantPick(row.key, e.target.value)}
                        >
                          <option value="">Selecione…</option>
                          {filteredVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          inputMode="decimal"
                          className="w-full border rounded-md px-2 py-2 min-h-11 tabular-nums"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          value={row.quantity}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) => (l.key === row.key ? { ...l, quantity: e.target.value } : l)),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          inputMode="decimal"
                          className="w-full border rounded-md px-2 py-2 min-h-11 tabular-nums"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          value={row.unitPrice}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) => (l.key === row.key ? { ...l, unitPrice: e.target.value } : l)),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-full border rounded-md px-2 py-2 min-h-11"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          value={row.description}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) => (l.key === row.key ? { ...l, description: e.target.value } : l)),
                            )
                          }
                          placeholder="Opcional"
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="text-xs min-h-9 px-2 rounded border touch-manipulation"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.error }}
                          onClick={() =>
                            setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== row.key)))
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="text-sm min-h-11 px-3 rounded-md border touch-manipulation"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              onClick={() => setLines((prev) => [...prev, emptyLine(nextKey())])}
            >
              Adicionar linha
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-medium tabular-nums" style={{ color: lmfitTokens.text }}>
          Total (preview): {formatBRL(linesLocked ? computeLineTotal(lockedDisplayLines) : previewTotal)}
        </p>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 px-5 rounded-md text-sm font-medium text-white disabled:opacity-60 touch-manipulation"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function ReadOnlyLinesTable({
  lines,
  variantById,
}: {
  lines: OrderLineInput[];
  variantById: Map<string, VariantOpt>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="border-b" style={{ borderColor: lmfitTokens.border }}>
            <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
              Variante
            </th>
            <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
              Qtd
            </th>
            <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
              Preço unit.
            </th>
            <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
              Descrição
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-4" style={{ color: lmfitTokens.textMuted }}>
                Sem linhas.
              </td>
            </tr>
          ) : (
            lines.map((l, idx) => {
              const label = variantById.get(l.variantId)?.label ?? l.variantId;
              return (
                <tr key={`${idx}-${l.variantId}`} className="border-b" style={{ borderColor: lmfitTokens.border }}>
                  <td className="py-2 pr-2" style={{ color: lmfitTokens.text }}>
                    {label}
                  </td>
                  <td className="py-2 pr-2 tabular-nums" style={{ color: lmfitTokens.text }}>
                    {l.quantity}
                  </td>
                  <td className="py-2 pr-2 tabular-nums" style={{ color: lmfitTokens.text }}>
                    {formatBRL(l.unitPrice)}
                  </td>
                  <td className="py-2 pr-2" style={{ color: lmfitTokens.textMuted }}>
                    {l.description ?? "—"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
