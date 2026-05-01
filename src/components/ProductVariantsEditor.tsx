"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProductVariantDraft } from "@/lib/products/variantDrafts";
import { draftsFromProductRow } from "@/lib/products/variantDrafts";
import { formatBRLInputDisplay, parseBRLMoneyInput } from "@/lib/inputMasks";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;

function cloneDrafts(d: ProductVariantDraft[]): ProductVariantDraft[] {
  return d.map((x) => ({ ...x }));
}

export function ProductVariantsEditor({
  resetKey,
  productRow,
  onDraftsChange,
}: {
  /** Incrementado ao abrir criar/editar — reinicia o estado local. */
  resetKey: number;
  productRow: Row | null;
  onDraftsChange: (drafts: ProductVariantDraft[]) => void;
}) {
  const [drafts, setDrafts] = useState<ProductVariantDraft[]>(() =>
    cloneDrafts(draftsFromProductRow(productRow)),
  );

  useEffect(() => {
    const next = cloneDrafts(draftsFromProductRow(productRow));
    setDrafts(next);
    onDraftsChange(next);
    // resetKey dispara ao reabrir modal; productRow identifica o registro em edição
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDraftsChange é estável o suficiente (ref no pai)
  }, [resetKey, productRow]);

  const pushDrafts = useCallback(
    (next: ProductVariantDraft[]) => {
      setDrafts(next);
      onDraftsChange(next);
    },
    [onDraftsChange],
  );

  const hint = useMemo(
    () =>
      "Cada linha é uma combinação (cor × tamanho) com SKU e estoque próprios, no estilo Nuvemshop / variações de e-commerce.",
    [],
  );

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <h3 className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
          Variações (cor / tamanho)
        </h3>
        <p className="text-xs mt-1 leading-snug" style={{ color: lmfitTokens.textMuted }}>
          {hint}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: lmfitTokens.border }}>
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Cor
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Tamanho
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                SKU
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Preço (BRL)
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Estoque
              </th>
              <th className="px-2 py-2 w-10" aria-label="Remover" />
            </tr>
          </thead>
          <tbody>
            {drafts.map((d, i) => (
              <tr key={d.clientKey} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    className="w-full min-w-[5.5rem] border rounded px-2 py-1.5 min-h-9 text-sm"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    placeholder="Ex.: Preto"
                    value={d.color}
                    onChange={(e) => {
                      const next = drafts.slice();
                      next[i] = { ...d, color: e.target.value };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    className="w-full min-w-[4rem] border rounded px-2 py-1.5 min-h-9 text-sm"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    placeholder="Ex.: M"
                    value={d.size}
                    onChange={(e) => {
                      const next = drafts.slice();
                      next[i] = { ...d, size: e.target.value };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    className="w-full min-w-[6rem] border rounded px-2 py-1.5 min-h-9 text-sm font-mono"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    placeholder="SKU único"
                    value={d.sku}
                    onChange={(e) => {
                      const next = drafts.slice();
                      next[i] = { ...d, sku: e.target.value };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full min-w-[6rem] border rounded px-2 py-1.5 min-h-9 text-sm tabular-nums"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    value={formatBRLInputDisplay(Number.isFinite(d.price) ? d.price.toFixed(2) : "")}
                    onChange={(e) => {
                      const raw = parseBRLMoneyInput(e.target.value);
                      const n = raw === "" ? 0 : Number(raw);
                      const next = drafts.slice();
                      next[i] = { ...d, price: Number.isFinite(n) ? n : 0 };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-full min-w-[4rem] border rounded px-2 py-1.5 min-h-9 text-sm tabular-nums"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    value={Number.isFinite(d.quantityInStock) ? String(d.quantityInStock) : "0"}
                    onChange={(e) => {
                      const n = Math.max(0, Math.floor(Number(e.target.value)));
                      const next = drafts.slice();
                      next[i] = { ...d, quantityInStock: Number.isFinite(n) ? n : 0 };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-1 py-1.5 align-middle text-center">
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded border touch-manipulation disabled:opacity-40"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.error }}
                    disabled={drafts.length <= 1}
                    title={drafts.length <= 1 ? "Mantenha ao menos uma variação" : "Remover linha"}
                    onClick={() => {
                      if (drafts.length <= 1) return;
                      pushDrafts(drafts.filter((_, j) => j !== i));
                    }}
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
        className="text-sm min-h-10 px-3 rounded-md border touch-manipulation"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        onClick={() => {
          const last = drafts[drafts.length - 1];
          pushDrafts([
            ...drafts,
            {
              clientKey: `v-${Date.now()}-${drafts.length}`,
              sku: "",
              color: last?.color ?? "Único",
              size: last?.size ?? "Único",
              price: typeof last?.price === "number" ? last.price : 0,
              quantityInStock: 0,
            },
          ]);
        }}
      >
        + Adicionar cor / tamanho
      </button>
    </div>
  );
}
