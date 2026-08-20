"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listProductsForBulk } from "@/lib/products/productsApi";
import { Barcode, isValidEan13 } from "@/components/atoms/Barcode";
import { lmfitTokens } from "@/theme/tokens";

type LabelRow = {
  variantId: string;
  productName: string;
  sku: string;
  color?: string;
  size?: string;
  barcode?: string;
  price: number;
};

/** BRL money fields chegam formatados como string pt-BR ("37,79") via
 *  BrlMoneyResponseInterceptor global — mesmo parser já usado em ProductGrid.tsx. */
function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Loop 35 — tela de etiquetas: lista toda variante real do tenant (nome do produto + cor/tamanho +
 * SKU + código de barras), staff seleciona quais quer imprimir, gera uma folha pronta pra
 * `window.print()`. Mesmo molde de CSS `@media print` do `PrintOrderClient.tsx` (Loop de impressão
 * de pedido) — aside/header somem, só a `.print-area` fica visível.
 */
export function LabelsClient() {
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPrice, setShowPrice] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [sheetWidthCm, setSheetWidthCm] = useState(10);
  const [sheetHeightCm, setSheetHeightCm] = useState(15);
  const [tagWidthCm, setTagWidthCm] = useState(3.8);
  const [tagHeightCm, setTagHeightCm] = useState(2.5);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await listProductsForBulk({ limit: 1000 });
      const flat: LabelRow[] = [];
      for (const p of items) {
        const productName = String(p.name ?? "Produto");
        const variants = Array.isArray(p.variants) ? p.variants : [];
        for (const v of variants) {
          const variantId = String(v._id ?? v.id ?? "");
          if (!variantId) continue;
          flat.push({
            variantId,
            productName,
            sku: v.sku ?? "",
            color: v.color,
            size: v.size,
            barcode: v.barcode,
            price: extractPrice(v.price),
          });
        }
      }
      setRows(flat);
    } catch {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.barcode ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.variantId));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setQty((prev) => (prev[id] ? prev : { ...prev, [id]: 1 }));
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const r of filtered) next.delete(r.variantId);
        return next;
      }
      const next = new Set(prev);
      for (const r of filtered) next.add(r.variantId);
      return next;
    });
    setQty((prev) => {
      const next = { ...prev };
      for (const r of filtered) if (!next[r.variantId]) next[r.variantId] = 1;
      return next;
    });
  }

  function setQtyFor(id: string, value: number) {
    const clamped = Math.max(1, Math.min(999, Math.round(value) || 1));
    setQty((prev) => ({ ...prev, [id]: clamped }));
  }

  const selectedRows = rows.filter((r) => selected.has(r.variantId));

  /** Cada etiqueta selecionada repete `qty[variantId]` vezes na prévia/impressão — pedido explícito
   *  do usuário (ex. 6 etiquetas da mesma variante), não apenas uma por variante distinta. */
  const printItems = useMemo(() => {
    const out: Array<LabelRow & { copyKey: string }> = [];
    for (const r of selectedRows) {
      const n = qty[r.variantId] ?? 1;
      for (let i = 0; i < n; i++) out.push({ ...r, copyKey: `${r.variantId}-${i}` });
    }
    return out;
  }, [selectedRows, qty]);

  const totalLabelCount = printItems.length;

  const sheetCols = Math.max(1, Math.floor(sheetWidthCm / tagWidthCm));
  const sheetRows = Math.max(1, Math.floor(sheetHeightCm / tagHeightCm));
  const sheetCapacity = tagWidthCm > sheetWidthCm || tagHeightCm > sheetHeightCm ? 0 : sheetCols * sheetRows;

  /** Etiqueta física é fixa em cm (`overflow: hidden` pra nunca vazar sobre a vizinha na
   *  impressão) — a altura do código de barras (barra + margem do jsbarcode + o próprio texto do
   *  EAN-13 embaixo) precisa encolher junto quando a etiqueta é pequena, senão o preço/nome fica
   *  cortado embaixo. ~37.8px/cm (96dpi); `barcodeMargin`/`barcodeFontSize` somam de volta ao
   *  orçamento total porque o `<canvas>` do jsbarcode inclui as duas margens + a linha de texto,
   *  não só a altura das barras. */
  const barcodeMargin = 2;
  const barcodeFontSize = 8;
  const barcodeExtra = barcodeMargin * 2 + (barcodeFontSize + 4);
  const reservedPx = (showPrice ? 12 : 0) + 11 + 6 + 6 + barcodeExtra;
  const barcodeHeightPx = Math.max(14, Math.round(tagHeightCm * 37.8) - reservedPx);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: ${sheetWidthCm}cm ${sheetHeightCm}cm;
            margin: 0.2cm;
          }
          aside, header, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-area {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: lmfitTokens.text }}>
            Etiquetas
          </h1>
          <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
            Selecione as variantes e imprima etiquetas com o código de barras real de cada uma.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className="lg:col-span-5 rounded-lg border bg-[var(--card-bg)] p-5 space-y-4 no-print"
          style={{ borderColor: lmfitTokens.border }}
        >
          <input
            type="search"
            placeholder="Buscar por produto, SKU ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />

          <label className="flex items-center gap-2 text-sm" style={{ color: lmfitTokens.text }}>
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            Mostrar preço na etiqueta
          </label>

          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: lmfitTokens.border }}>
            <p className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
              Tamanho da folha/rolo de impressão
            </p>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                min={1}
                step={0.1}
                value={sheetWidthCm}
                onChange={(e) => setSheetWidthCm(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-16 px-2 py-1 rounded border text-sm outline-none"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
              <span style={{ color: lmfitTokens.textMuted }}>×</span>
              <input
                type="number"
                min={1}
                step={0.1}
                value={sheetHeightCm}
                onChange={(e) => setSheetHeightCm(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-16 px-2 py-1 rounded border text-sm outline-none"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
              <span style={{ color: lmfitTokens.textMuted }}>cm</span>
              <button
                type="button"
                onClick={() => {
                  setSheetWidthCm(10);
                  setSheetHeightCm(15);
                }}
                className="ml-auto text-xs underline"
                style={{ color: lmfitTokens.primary }}
              >
                10×15
              </button>
              <button
                type="button"
                onClick={() => {
                  setSheetWidthCm(21);
                  setSheetHeightCm(29.7);
                }}
                className="text-xs underline"
                style={{ color: lmfitTokens.primary }}
              >
                A4
              </button>
            </div>

            <p className="text-xs font-semibold pt-1" style={{ color: lmfitTokens.textMuted }}>
              Tamanho de cada etiqueta
            </p>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                min={0.5}
                step={0.1}
                value={tagWidthCm}
                onChange={(e) => setTagWidthCm(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-16 px-2 py-1 rounded border text-sm outline-none"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
              <span style={{ color: lmfitTokens.textMuted }}>×</span>
              <input
                type="number"
                min={0.5}
                step={0.1}
                value={tagHeightCm}
                onChange={(e) => setTagHeightCm(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                className="w-16 px-2 py-1 rounded border text-sm outline-none"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
              <span style={{ color: lmfitTokens.textMuted }}>cm</span>
            </div>

            {sheetCapacity > 0 ? (
              <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                Cabem <strong style={{ color: lmfitTokens.text }}>{sheetCapacity} etiquetas</strong> por folha (
                {sheetCols} colunas × {sheetRows} linhas)
              </p>
            ) : (
              <p className="text-xs" style={{ color: lmfitTokens.error }}>
                A etiqueta é maior que a folha — reduza o tamanho da etiqueta ou aumente a folha.
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              Carregando…
            </p>
          ) : error ? (
            <p className="text-sm" style={{ color: lmfitTokens.error }}>
              {error}
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
              <div
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
              >
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} />
                <span>
                  {selected.size} selecionada(s) · {filtered.length} variante(s)
                </span>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y" style={{ borderColor: lmfitTokens.border }}>
                {filtered.map((r) => (
                  <label
                    key={r.variantId}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--hover-bg)]"
                  >
                    <input type="checkbox" checked={selected.has(r.variantId)} onChange={() => toggle(r.variantId)} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ color: lmfitTokens.text }}>
                        {r.productName}
                        {r.color || r.size ? ` · ${[r.color, r.size].filter(Boolean).join(" / ")}` : ""}
                      </span>
                      <span className="block text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
                        {r.sku} {r.barcode ? `· ${r.barcode}` : ""}
                      </span>
                    </span>
                    {selected.has(r.variantId) ? (
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={qty[r.variantId] ?? 1}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) => setQtyFor(r.variantId, parseInt(e.target.value, 10))}
                        title="Quantidade de etiquetas"
                        className="w-14 px-1.5 py-1 rounded border text-xs text-center outline-none shrink-0"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    ) : null}
                  </label>
                ))}
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-center" style={{ color: lmfitTokens.textMuted }}>
                    Nenhuma variante encontrada.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedRows.length === 0}
            className="w-full min-h-11 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            Imprimir {totalLabelCount > 0 ? `(${totalLabelCount})` : ""}
          </button>
        </div>

        <div
          className="lg:col-span-7 rounded-lg border bg-white p-5 print-area"
          style={{ borderColor: lmfitTokens.border }}
        >
          {selectedRows.length === 0 ? (
            <p className="text-sm no-print" style={{ color: lmfitTokens.textMuted }}>
              Selecione ao menos uma variante pra ver a prévia das etiquetas.
            </p>
          ) : (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${sheetCols}, ${tagWidthCm}cm)` }}
            >
              {printItems.map((r) => (
                <div
                  key={r.copyKey}
                  className="border rounded p-1 flex flex-col items-center justify-center text-center gap-0.5 overflow-hidden"
                  style={{ borderColor: "#00000033", width: `${tagWidthCm}cm`, height: `${tagHeightCm}cm` }}
                >
                  <span className="text-[9px] font-semibold leading-none text-black">
                    {r.productName}
                    {r.color || r.size ? ` · ${[r.color, r.size].filter(Boolean).join("/")}` : ""}
                  </span>
                  {r.barcode ? (
                    // EAN-13 real (13 dígitos) já mostra os números embaixo das barras via
                    // `displayValue` — não duplica o texto. Um código antigo/não-numérico ainda
                    // cai no Code128 com o texto separado embaixo.
                    isValidEan13(r.barcode) ? (
                      <Barcode
                        value={r.barcode}
                        format="EAN13"
                        width={1.2}
                        height={barcodeHeightPx}
                        margin={barcodeMargin}
                        fontSize={barcodeFontSize}
                      />
                    ) : (
                      <>
                        <Barcode
                          value={r.barcode}
                          width={1.2}
                          height={barcodeHeightPx}
                          margin={barcodeMargin}
                          fontSize={barcodeFontSize}
                        />
                        <span className="text-[8px] font-mono leading-none text-black">{r.barcode}</span>
                      </>
                    )
                  ) : (
                    <span className="text-[8px] font-mono leading-none text-black">{r.sku}</span>
                  )}
                  {showPrice ? (
                    <span className="text-[10px] font-bold leading-none text-black">
                      R$ {r.price.toFixed(2).replace(".", ",")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
