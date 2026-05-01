"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { formatBRL } from "@/lib/formatMoney";
import { documentId } from "@/lib/normalizeApiList";
import {
  bulkPatchProducts,
  listProductsForBulk,
  summarizeInventoryProduct,
  type InventoryProduct,
} from "@/lib/products/productsApi";
import { applyBulkChange, useInventoryBulkStore, type BulkChange } from "@/stores/useInventoryBulkStore";
import { lmfitTokens } from "@/theme/tokens";

type Row = InventoryProduct & { _id: string };

function rowId(p: InventoryProduct): string {
  return String(p._id ?? p.id ?? documentId(p) ?? p.sku ?? "");
}

export function BulkEditorClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ updated: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useInventoryBulkStore((s) => s.selected);
  const selectedIds = useMemo(() => Object.keys(selected), [selected]);
  const toggle = useInventoryBulkStore((s) => s.toggle);
  const setMany = useInventoryBulkStore((s) => s.setMany);
  const clearSelection = useInventoryBulkStore((s) => s.clear);
  const setLastApplied = useInventoryBulkStore((s) => s.setLastApplied);

  const [pricePercent, setPricePercent] = useState<number | "">("");
  const [priceSet, setPriceSet] = useState<number | "">("");
  const [qtySet, setQtySet] = useState<number | "">("");
  const [qtyDelta, setQtyDelta] = useState<number | "">("");

  const load = useCallback(async (term = search) => {
    setLoading(true);
    try {
      const { items } = await listProductsForBulk({ search: term, limit: 100 });
      const mapped = items
        .map((p) => ({ ...p, _id: rowId(p) }))
        .filter((p) => p._id);
      setRows(mapped as Row[]);
      setError(null);
    } catch {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAll = useCallback(() => {
    const ids = rows.map((r) => r._id);
    const allSelected = ids.every((id) => selected[id]);
    setMany(ids, !allSelected);
  }, [rows, selected, setMany]);

  const applyChange = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const change: BulkChange = {};
    if (priceSet !== "") change.priceSet = Number(priceSet);
    else if (pricePercent !== "") change.pricePercent = Number(pricePercent);
    if (qtySet !== "") change.quantityInStockSet = Number(qtySet);
    else if (qtyDelta !== "") change.quantityInStockDelta = Number(qtyDelta);
    if (Object.keys(change).length === 0) {
      setError("Informe ao menos um ajuste de preço ou estoque.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const prevSnapshot = new Map(rows.map((r) => [r._id, r]));
    const applyRowOptimistic = (r: Row): Row => {
      const next = { ...r, ...applyBulkChange(r, change) } as Row;
      if (Array.isArray(next.variants) && next.variants.length) {
        next.variants = next.variants.map((v) => {
          const base = {
            price: typeof v.price === "number" ? v.price : next.price ?? 0,
            quantityInStock:
              typeof v.quantityInStock === "number"
                ? v.quantityInStock
                : typeof v.quantityOnHand === "number"
                  ? v.quantityOnHand
                  : 0,
          };
          const patched = applyBulkChange(base, change);
          return {
            ...v,
            price: patched.price ?? v.price,
            quantityInStock: patched.quantityInStock ?? v.quantityInStock,
            quantityOnHand: patched.quantityInStock ?? v.quantityOnHand,
          };
        });
      }
      return next;
    };
    setRows((prev) =>
      prev.map((r) => (selectedIds.includes(r._id) ? applyRowOptimistic(r) : r)),
    );

    try {
      const result = await bulkPatchProducts(selectedIds, change);
      if (result.failed.length) {
        setRows((prev) =>
          prev.map((r) => {
            const failed = result.failed.find((f) => f.id === r._id);
            if (!failed) return r;
            const original = prevSnapshot.get(r._id);
            return original ? (original as Row) : r;
          }),
        );
      }
      setStatus({ updated: result.updated.length, failed: result.failed.length });
      setLastApplied(change);
      if (result.failed.length === 0) {
        clearSelection();
        setPricePercent("");
        setPriceSet("");
        setQtySet("");
        setQtyDelta("");
      }
      // Sempre buscar o estado real do servidor após aplicar: garante que produtos com variantes
      // (onde o backend pode ter propagado ajuste) apareçam com números coerentes.
      void load();
    } catch (e) {
      setRows((prev) => prev.map((r) => (prevSnapshot.get(r._id) as Row) ?? r));
      const msg = e instanceof Error ? e.message : "Erro ao aplicar alterações.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [rows, selectedIds, priceSet, pricePercent, qtySet, qtyDelta, setLastApplied, clearSelection, load]);

  const allSelected = rows.length > 0 && rows.every((r) => selected[r._id]);

  const selectedHasVariants = useMemo(
    () => selectedIds.some((id) => {
      const row = rows.find((r) => r._id === id);
      return row ? summarizeInventoryProduct(row).hasVariants : false;
    }),
    [rows, selectedIds],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
            Edição em lote
          </h1>
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            Ajuste preço e estoque de vários produtos de uma vez (optimistic + rollback em caso de erro).
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm underline"
          style={{ color: lmfitTokens.primary }}
        >
          Voltar para Produtos
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          inputMode="search"
          placeholder="Buscar produtos…"
          className="flex-1 min-w-48 min-h-10 border rounded-md px-3 text-sm bg-white"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button
          type="button"
          className="inline-flex items-center gap-1 min-h-10 px-3 rounded-md border bg-white text-sm"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden />
          Recarregar
        </button>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>{error}</p>
      ) : null}
      {status ? (
        <p className="text-sm" style={{ color: status.failed ? lmfitTokens.error : lmfitTokens.success }}>
          {status.updated} atualizado(s) · {status.failed} falha(s)
        </p>
      ) : null}
      {selectedHasVariants ? (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Atenção: alguns itens selecionados possuem variantes. O preço/estoque real vive em cada variante —
          o backend pode ignorar o ajuste para esses produtos até oferecer `PATCH /products/bulk` com
          propagação para variantes.
        </p>
      ) : null}

      <section
        className="rounded-lg border bg-white p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        style={{ borderColor: lmfitTokens.border }}
      >
        <label className="text-xs col-span-1" style={{ color: lmfitTokens.textMuted }}>
          Preço ±%
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={pricePercent}
            onChange={(e) => setPricePercent(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={priceSet !== ""}
            className="mt-1 block w-full border rounded px-2 py-1.5 text-sm bg-white"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="ex.: 10"
          />
        </label>
        <label className="text-xs col-span-1" style={{ color: lmfitTokens.textMuted }}>
          Preço = valor fixo
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={priceSet}
            onChange={(e) => setPriceSet(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 block w-full border rounded px-2 py-1.5 text-sm bg-white"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="ex.: 79.90"
          />
        </label>
        <label className="text-xs col-span-1" style={{ color: lmfitTokens.textMuted }}>
          Estoque ± ajuste
          <input
            type="number"
            inputMode="numeric"
            step="1"
            value={qtyDelta}
            onChange={(e) => setQtyDelta(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={qtySet !== ""}
            className="mt-1 block w-full border rounded px-2 py-1.5 text-sm bg-white"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="ex.: -2"
          />
        </label>
        <label className="text-xs col-span-1" style={{ color: lmfitTokens.textMuted }}>
          Estoque = valor fixo
          <input
            type="number"
            inputMode="numeric"
            step="1"
            value={qtySet}
            onChange={(e) => setQtySet(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1 block w-full border rounded px-2 py-1.5 text-sm bg-white"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="ex.: 10"
          />
        </label>
        <button
          type="button"
          className="min-h-11 rounded-md text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: lmfitTokens.primary }}
          onClick={applyChange}
          disabled={submitting || selectedIds.length === 0}
        >
          {submitting ? "Aplicando…" : `Aplicar em ${selectedIds.length}`}
        </button>
      </section>

      <section className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
        <div
          className="flex items-center gap-2 border-b px-3 py-2 text-xs"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
        >
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1"
            aria-label="Selecionar todos"
          >
            {allSelected ? <Check size={14} aria-hidden /> : <ChevronsUpDown size={14} aria-hidden />}
            <span>{allSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
          </button>
          <span className="flex-1" />
          <span>{rows.length} produto(s)</span>
        </div>
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: lmfitTokens.textMuted }}>
            Nenhum produto carregado.
          </div>
        ) : (
          <ul>
            {rows.map((r) => {
              const checked = !!selected[r._id];
              const agg = summarizeInventoryProduct(r);
              return (
                <li key={r._id} className="flex items-center gap-3 border-b last:border-0 px-3 py-2"
                  style={{ borderColor: lmfitTokens.border }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r._id)}
                    aria-label={`Selecionar ${r.name ?? r.sku}`}
                    className="accent-lmfit-primary w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate flex items-center gap-2" style={{ color: lmfitTokens.text }}>
                      <span className="truncate">{String(r.name ?? "—")}</span>
                      {agg.hasVariants ? (
                        <Badge variant="neutral" size="xs">
                          {agg.variantCount} var.
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
                      {String(r.sku ?? r._id)}
                    </div>
                  </div>
                  <div className="tabular-nums text-sm" style={{ color: lmfitTokens.text }}>
                    {agg.mixedPrices ? (
                      <span style={{ color: lmfitTokens.textMuted }}>preços mistos</span>
                    ) : (
                      formatBRL(agg.displayPrice)
                    )}
                  </div>
                  <Badge variant={agg.displayStock > 0 ? "estoque" : "estornado"} size="xs">
                    {agg.displayStock > 0 ? `${agg.displayStock} un.` : "Esgotado"}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
