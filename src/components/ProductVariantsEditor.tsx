"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductVariantDraft } from "@/lib/products/variantDrafts";
import { draftsFromProductRow } from "@/lib/products/variantDrafts";
import { formatBRLInputDisplay, parseBRLMoneyInput } from "@/lib/inputMasks";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;

function cloneDrafts(d: ProductVariantDraft[]): ProductVariantDraft[] {
  return d.map((x) => ({ ...x }));
}

export function generateSkuSuggestion(name: string, color: string, size: string): string {
  const clean = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, "") // keep only alphanumeric, spaces and hyphens
      .trim();

  const nameClean = clean(name);
  const colorClean = clean(color);
  const sizeClean = clean(size);

  // Abbreviate name
  let namePart = "";
  if (nameClean) {
    // Split by spaces or hyphens, remove stop words
    const stopWords = new Set([
      "DE", "COM", "PARA", "O", "A", "OS", "AS", "EM", "DO", "DA", "DOS", "DAS",
      "UM", "UMA", "OF", "WITH", "FOR", "THE", "AND", "TAMANHO", "TAM", "COR"
    ]);
    const words = nameClean.split(/[\s-]+/).filter(w => w && !stopWords.has(w));
    
    if (words.length > 0) {
      // Abbreviate each word
      const parts = words.slice(0, 2).map(w => {
        if (w.length <= 3) return w;
        // Keep first letter, remove vowels from the rest
        const first = w[0];
        const rest = w.slice(1).replace(/[AEIOU]/g, "");
        // Compress double letters (e.g., GG -> G)
        const compressed = (first + rest).replace(/(.)\1+/g, "$1");
        return compressed.slice(0, 4); // Limit to 4 chars per word
      });
      namePart = parts.join("");
    }
  }

  // Abbreviate color
  let colorPart = "";
  if (colorClean && colorClean !== "UNICO" && colorClean !== "UNICA") {
    const words = colorClean.split(/[\s-]+/).filter(Boolean);
    if (words.length > 1) {
      colorPart = words.map(w => w[0]).join("").slice(0, 3);
    } else {
      const w = words[0] || "";
      colorPart = w.slice(0, 3);
    }
  }

  // Abbreviate size
  let sizePart = "";
  if (sizeClean && sizeClean !== "UNICO" && sizeClean !== "UNICA") {
    sizePart = sizeClean.slice(0, 3);
  }

  return [namePart, colorPart, sizePart].filter(Boolean).join("-");
}

export function ProductVariantsEditor({
  resetKey,
  productRow,
  productName = "",
  onDraftsChange,
}: {
  /** Incrementado ao abrir criar/editar — reinicia o estado local. */
  resetKey: number;
  productRow: Row | null;
  productName?: string;
  onDraftsChange: (drafts: ProductVariantDraft[]) => void;
}) {
  const [drafts, setDrafts] = useState<ProductVariantDraft[]>(() =>
    cloneDrafts(draftsFromProductRow(productRow)),
  );

  const prevNameRef = useRef(productName);
  useEffect(() => {
    if (prevNameRef.current !== productName) {
      const prevName = prevNameRef.current;
      prevNameRef.current = productName;

      setDrafts((prev) => {
        const next = prev.map((d) => {
          const prevSuggestion = generateSkuSuggestion(prevName, d.color, d.size);
          const isAuto = !d.sku.trim() || d.sku === prevSuggestion;
          if (isAuto) {
            return { ...d, sku: generateSkuSuggestion(productName, d.color, d.size) };
          }
          return d;
        });
        onDraftsChange(next);
        return next;
      });
    }
  }, [productName, onDraftsChange]);

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

      {drafts.length <= 1 && drafts[0]?.sku === "" && drafts[0]?.color === "Único" && (
        <div className="p-3 rounded-lg border bg-gray-50 flex flex-col gap-2" style={{ borderColor: lmfitTokens.border }}>
          <p className="text-xs font-medium text-gray-700">Gerar Variações Automaticamente</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              id="auto-colors"
              placeholder="Cores (ex: Preto, Branco)" 
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <input 
              id="auto-sizes"
              placeholder="Tamanhos (ex: P, M, G)" 
              className="border rounded px-2 py-1 text-sm flex-1"
            />
            <button
              type="button"
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              onClick={() => {
                const colorStr = (document.getElementById("auto-colors") as HTMLInputElement)?.value || "";
                const sizeStr = (document.getElementById("auto-sizes") as HTMLInputElement)?.value || "";
                const colors = colorStr.split(",").map(c => c.trim()).filter(Boolean);
                const sizes = sizeStr.split(",").map(s => s.trim()).filter(Boolean);
                
                if (!colors.length && !sizes.length) return;
                
                const cList = colors.length ? colors : ["Único"];
                const sList = sizes.length ? sizes : ["Único"];
                
                const nextDrafts: ProductVariantDraft[] = [];
                let seq = 0;
                for (const c of cList) {
                  for (const s of sList) {
                    nextDrafts.push({
                      clientKey: `auto-${Date.now()}-${seq++}`,
                      sku: generateSkuSuggestion(productName, c, s),
                      color: c,
                      size: s,
                      price: drafts[0]?.price || 0,
                      quantityInStock: drafts[0]?.quantityInStock || 0,
                    });
                  }
                }
                pushDrafts(nextDrafts);
              }}
            >
              Gerar
            </button>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-1.5">
                  <span>SKU</span>
                  <button
                    type="button"
                    title="Sugerir SKUs automaticamente para todas as variações vazias"
                    className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-all font-semibold cursor-pointer animate-pulse"
                    onClick={() => {
                      const next = drafts.map(x => ({
                        ...x,
                        sku: x.sku.trim() || generateSkuSuggestion(productName, x.color, x.size)
                      }));
                      pushDrafts(next);
                    }}
                  >
                    ✨ Sugerir
                  </button>
                </div>
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
                      const newColor = e.target.value;
                      const prevSuggestion = generateSkuSuggestion(productName, d.color, d.size);
                      const isAuto = !d.sku.trim() || d.sku === prevSuggestion;
                      const nextSku = isAuto ? generateSkuSuggestion(productName, newColor, d.size) : d.sku;
                      const next = drafts.slice();
                      next[i] = { ...d, color: newColor, sku: nextSku };
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
                      const newSize = e.target.value;
                      const prevSuggestion = generateSkuSuggestion(productName, d.color, d.size);
                      const isAuto = !d.sku.trim() || d.sku === prevSuggestion;
                      const nextSku = isAuto ? generateSkuSuggestion(productName, d.color, newSize) : d.sku;
                      const next = drafts.slice();
                      next[i] = { ...d, size: newSize, sku: nextSku };
                      pushDrafts(next);
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    className="w-full min-w-[6rem] border rounded px-2 py-1.5 min-h-9 text-sm font-mono"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    placeholder={generateSkuSuggestion(productName, d.color, d.size) || "SKU único"}
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
              sku: generateSkuSuggestion(productName, last?.color ?? "Único", last?.size ?? "Único"),
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
