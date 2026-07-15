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
  applyPriceToAll,
}: {
  /** Incrementado ao abrir criar/editar — reinicia o estado local. */
  resetKey: number;
  productRow: Row | null;
  productName?: string;
  onDraftsChange: (drafts: ProductVariantDraft[]) => void;
  /** Muda o `token` pra aplicar `value` como preço de todas as linhas (ex.: calculadora de custo+margem). */
  applyPriceToAll?: { value: number; token: number };
}) {
  const [drafts, setDrafts] = useState<ProductVariantDraft[]>(() =>
    cloneDrafts(draftsFromProductRow(productRow)),
  );

  const prevNameRef = useRef(productName);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const prevApplyTokenRef = useRef(applyPriceToAll?.token);

  useEffect(() => {
    if (prevNameRef.current !== productName) {
      const prevName = prevNameRef.current;
      prevNameRef.current = productName;

      const next = draftsRef.current.map((d) => {
        const prevSuggestion = generateSkuSuggestion(prevName, d.color, d.size);
        const isAuto = !d.sku.trim() || d.sku === prevSuggestion;
        if (isAuto) {
          return { ...d, sku: generateSkuSuggestion(productName, d.color, d.size) };
        }
        return d;
      });

      setDrafts(next);
      onDraftsChange(next);
    }
  }, [productName, onDraftsChange]);

  useEffect(() => {
    const next = cloneDrafts(draftsFromProductRow(productRow));
    setDrafts(next);
    onDraftsChange(next);
    prevApplyTokenRef.current = applyPriceToAll?.token;
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

  useEffect(() => {
    if (!applyPriceToAll) return;
    if (prevApplyTokenRef.current === applyPriceToAll.token) return;
    prevApplyTokenRef.current = applyPriceToAll.token;
    if (!Number.isFinite(applyPriceToAll.value) || applyPriceToAll.value < 0) return;
    // Preço ajustado à mão numa variação não é sobrescrito pela calculadora.
    const next = draftsRef.current.map((d) =>
      d.priceManuallySet ? d : { ...d, price: applyPriceToAll.value },
    );
    pushDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushDrafts/draftsRef são estáveis o suficiente
  }, [applyPriceToAll]);

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
        <div className="p-3 rounded-lg border flex flex-col gap-2" style={{ borderColor: lmfitTokens.border, backgroundColor: 'rgba(128, 128, 128, 0.05)' }}>
          <p className="text-xs font-medium" style={{ color: lmfitTokens.text }}>Gerar Variações Automaticamente</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              id="auto-colors"
              placeholder="Cores (ex: Preto, Branco)" 
              className="border rounded px-2 py-1 text-sm flex-1 bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
            <input 
              id="auto-sizes"
              placeholder="Tamanhos (ex: P, M, G)" 
              className="border rounded px-2 py-1 text-sm flex-1 bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
            <button
              type="button"
              className="px-3 py-1 rounded text-white text-sm transition-colors hover:opacity-80"
              style={{ backgroundColor: lmfitTokens.primary }}
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
                      acceptsBackorder: drafts[0]?.acceptsBackorder ?? false,
                      backorderMinQty: drafts[0]?.backorderMinQty ?? 1,
                      priceManuallySet: drafts[0]?.priceManuallySet ?? false,
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
                </div>
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Preço (BRL)
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Estoque
              </th>
              <th className="px-2 py-2 font-medium whitespace-nowrap" style={{ color: lmfitTokens.accentBlue }}>
                Encomenda
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
                    title={
                      d.priceManuallySet
                        ? "Preço ajustado manualmente — a calculadora de custo+margem não altera esta variação"
                        : undefined
                    }
                    onChange={(e) => {
                      const raw = parseBRLMoneyInput(e.target.value);
                      const n = raw === "" ? 0 : Number(raw);
                      const next = drafts.slice();
                      next[i] = { ...d, price: Number.isFinite(n) ? n : 0, priceManuallySet: true };
                      pushDrafts(next);
                    }}
                  />
                  {d.priceManuallySet ? (
                    <button
                      type="button"
                      className="block text-[10px] underline mt-0.5"
                      style={{ color: lmfitTokens.textMuted }}
                      title="Voltar a seguir o preço da calculadora de custo+margem"
                      onClick={() => {
                        const next = drafts.slice();
                        next[i] = { ...d, priceManuallySet: false };
                        pushDrafts(next);
                      }}
                    >
                      manual
                    </button>
                  ) : null}
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
                <td className="px-2 py-1.5 align-middle text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={d.acceptsBackorder}
                      title="Permite vender além do estoque (produção sob encomenda)"
                      onChange={(e) => {
                        const next = drafts.slice();
                        next[i] = { ...d, acceptsBackorder: e.target.checked };
                        pushDrafts(next);
                      }}
                    />
                    {d.acceptsBackorder ? (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-14 border rounded px-1.5 py-1 text-xs tabular-nums"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        value={String(d.backorderMinQty)}
                        title="A partir de quantas peças a encomenda pode ser feita"
                        onChange={(e) => {
                          const n = Math.max(1, Math.floor(Number(e.target.value)));
                          const next = drafts.slice();
                          next[i] = { ...d, backorderMinQty: Number.isFinite(n) ? n : 1 };
                          pushDrafts(next);
                        }}
                      />
                    ) : null}
                  </div>
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
              acceptsBackorder: false,
              backorderMinQty: 1,
              // preço copiado da última linha carrega junto o ajuste manual dela
              priceManuallySet: last?.priceManuallySet ?? false,
            },
          ]);
        }}
      >
        + Adicionar cor / tamanho
      </button>
    </div>
  );
}
