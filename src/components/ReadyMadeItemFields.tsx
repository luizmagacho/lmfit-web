"use client";

import { useEffect, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { http } from "@/lib/http";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { formatBRLInputDisplay, parseBRLMoneyInput } from "@/lib/inputMasks";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

export type Row = Record<string, unknown>;
export type SupplierOption = { value: string; label: string };

export type ReadyMadeValue = {
  isReadyMade: boolean;
  supplierId: string;
  costPrice: number;
  markupPercent: number;
  computedPrice: number;
};

const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: "2.5rem",
    borderRadius: "0.375rem",
    borderColor: lmfitTokens.border,
    backgroundColor: "var(--card-bg)",
    color: lmfitTokens.text,
  }),
  singleValue: (base: any) => ({ ...base, color: lmfitTokens.text }),
  input: (base: any) => ({ ...base, color: lmfitTokens.text }),
  menu: (base: any) => ({ ...base, zIndex: 50, backgroundColor: "var(--card-bg)" }),
  option: (base: any, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isFocused ? `${lmfitTokens.accentBlue}20` : "transparent",
    color: lmfitTokens.text,
    cursor: "pointer",
  }),
};

/** Mirrors the server-side calculation in products.service.ts resolveReadyMadePricing —
 * the sale price shown here is a preview, but must match what the server actually saves. */
export function computeReadyMadePrice(costPrice: number, markupPercent: number): number {
  return Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;
}

/** Derives the form's initial state from a product row (create modal → productRow is null;
 * edit modal → the saved product). Kept pure so field-mapping bugs are unit-testable. */
export function deriveInitialState(productRow: Row | null): {
  isReadyMade: boolean;
  supplierOpt: SupplierOption | null;
  costPriceInput: string;
  markupPercentInput: string;
} {
  const isReadyMade = productRow?.sourceType === "ready_made";
  const supId = productRow?.supplierId != null ? String(productRow.supplierId) : "";
  const supName = productRow?.supplierName != null ? String(productRow.supplierName) : "";
  const cost = productRow?.costPrice;
  const markup = productRow?.markupPercent;
  return {
    isReadyMade,
    supplierOpt: supId ? { value: supId, label: supName || supId } : null,
    costPriceInput: typeof cost === "number" ? cost.toFixed(2) : "",
    markupPercentInput: markup != null && markup !== "" ? String(markup) : "",
  };
}

async function loadSupplierOptions(inputValue: string): Promise<SupplierOption[]> {
  try {
    const { data } = await http.get<unknown>("/suppliers", { params: { page: 1, limit: 50, search: inputValue } });
    const items = extractListItems(data);
    return items
      .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
      .map((row) => ({ value: String(documentId(row)), label: row.name != null ? String(row.name) : String(documentId(row)) }))
      .filter((s) => s.value !== "undefined");
  } catch {
    return [];
  }
}

/**
 * "Item pronto" = comprado já pronto de um fornecedor (em vez de produzido internamente
 * via módulo de produção). Calcula o preço de venda a partir de custo + margem desejada,
 * e exige um fornecedor vinculado — regra espelhada no backend em resolveReadyMadePricing.
 */
export function ReadyMadeItemFields({
  resetKey,
  productRow,
  onChange,
}: {
  resetKey: number;
  productRow: Row | null;
  onChange: (v: ReadyMadeValue) => void;
}) {
  const [isReadyMade, setIsReadyMade] = useState(false);
  const [supplierOpt, setSupplierOpt] = useState<SupplierOption | null>(null);
  const [costPriceInput, setCostPriceInput] = useState("");
  const [markupPercentInput, setMarkupPercentInput] = useState("");
  const isUserEditRef = useRef(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierTaxId, setNewSupplierTaxId] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    const initial = deriveInitialState(productRow);
    setIsReadyMade(initial.isReadyMade);
    setSupplierOpt(initial.supplierOpt);
    setCostPriceInput(initial.costPriceInput);
    setMarkupPercentInput(initial.markupPercentInput);
  }, [resetKey, productRow]);

  const costPrice = costPriceInput ? Number(parseBRLMoneyInput(costPriceInput)) || 0 : 0;
  const markupPercent = markupPercentInput ? Number(markupPercentInput) || 0 : 0;
  const computedPrice = computeReadyMadePrice(costPrice, markupPercent);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current({
      isReadyMade,
      supplierId: supplierOpt?.value || "",
      costPrice,
      markupPercent,
      computedPrice,
      isUserEdit: isUserEditRef.current,
    });
    isUserEditRef.current = false;
  }, [isReadyMade, supplierOpt, costPrice, markupPercent, computedPrice]);

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setSavingSupplier(true);
    try {
      const res = await http.post("/suppliers", {
        name: newSupplierName.trim(),
        taxId: newSupplierTaxId.trim() || undefined,
        phone: newSupplierPhone.trim() || undefined,
      });
      setSupplierOpt({ value: String(res.data._id), label: String(res.data.name) });
      setShowSupplierModal(false);
      setNewSupplierName("");
      setNewSupplierTaxId("");
      setNewSupplierPhone("");
    } catch {
      alert("Erro ao criar fornecedor.");
    } finally {
      setSavingSupplier(false);
    }
  }

  return (
    <div className="space-y-3 sm:col-span-2 p-3 rounded-lg border" style={{ borderColor: lmfitTokens.border, backgroundColor: "rgba(128,128,128,0.05)" }}>
      <label className="flex items-center gap-2 text-sm font-medium" style={{ color: lmfitTokens.text }}>
        <input type="checkbox" className="w-4 h-4" checked={isReadyMade} onChange={(e) => { isUserEditRef.current = true; setIsReadyMade(e.target.checked); }} />
        Item pronto (comprado de fornecedor)
      </label>

      {isReadyMade ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block text-sm space-y-1 sm:col-span-3">
            <span style={{ color: lmfitTokens.textMuted }}>Fornecedor *</span>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadSupplierOptions}
                  styles={selectStyles}
                  placeholder="Selecione o fornecedor…"
                  value={supplierOpt}
                  onChange={(opt) => setSupplierOpt(opt as SupplierOption | null)}
                />
              </div>
              <button
                type="button"
                className="min-h-10 px-3 border rounded-md text-sm whitespace-nowrap"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
                onClick={() => setShowSupplierModal(true)}
              >
                + Novo
              </button>
            </div>
          </label>

          <label className="text-sm space-y-1">
            <span style={{ color: lmfitTokens.textMuted }}>Preço de custo (R$) *</span>
            <input
              type="text"
              inputMode="decimal"
              className="w-full min-h-10 border rounded-md px-3 py-2 tabular-nums"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
              value={formatBRLInputDisplay(costPriceInput)}
              onChange={(e) => { isUserEditRef.current = true; setCostPriceInput(parseBRLMoneyInput(e.target.value)); }}
              placeholder="0,00"
            />
          </label>

          <label className="text-sm space-y-1">
            <span style={{ color: lmfitTokens.textMuted }}>Margem desejada (%) *</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className="w-full min-h-10 border rounded-md px-3 py-2 tabular-nums"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
              value={markupPercentInput}
              onChange={(e) => { isUserEditRef.current = true; setMarkupPercentInput(e.target.value); }}
              placeholder="Ex.: 50"
            />
          </label>

          <label className="text-sm space-y-1">
            <span style={{ color: lmfitTokens.textMuted }}>Preço de venda (R$) *</span>
            <input
              type="text"
              inputMode="decimal"
              className="w-full min-h-10 border rounded-md px-3 py-2 tabular-nums font-semibold"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.success, backgroundColor: "var(--card-bg)" }}
              value={formatBRLInputDisplay(computedPrice > 0 ? computedPrice.toFixed(2) : "")}
              onChange={(e) => {
                isUserEditRef.current = true;
                const raw = parseBRLMoneyInput(e.target.value);
                const newSalePrice = raw ? Number(raw) || 0 : 0;
                if (costPrice > 0) {
                  const computedMarkup = ((newSalePrice / costPrice) - 1) * 100;
                  setMarkupPercentInput(Number.isFinite(computedMarkup) ? computedMarkup.toFixed(1) : "0");
                }
              }}
              placeholder="0,00"
            />
          </label>
        </div>
      ) : (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Deixe desmarcado para produtos produzidos internamente (custo calculado pelo módulo de Produção).
        </p>
      )}

      {showSupplierModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-lg p-5 w-full max-w-sm" style={{ color: lmfitTokens.text }}>
            <h3 className="text-lg font-medium mb-4">Novo fornecedor</h3>
            <div className="space-y-3">
              <label className="block text-sm">
                Nome *
                <input required className="w-full border rounded-md mt-1 px-3 py-2" style={{ borderColor: lmfitTokens.border }} value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
              </label>
              <label className="block text-sm">
                CNPJ
                <input className="w-full border rounded-md mt-1 px-3 py-2" style={{ borderColor: lmfitTokens.border }} value={newSupplierTaxId} onChange={(e) => setNewSupplierTaxId(e.target.value)} />
              </label>
              <label className="block text-sm">
                Telefone
                <input className="w-full border rounded-md mt-1 px-3 py-2" style={{ borderColor: lmfitTokens.border }} value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" className="flex-1 border rounded-md py-2" style={{ borderColor: lmfitTokens.border }} onClick={() => setShowSupplierModal(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md py-2 text-white"
                  style={{ background: lmfitTokens.primary }}
                  disabled={savingSupplier || !newSupplierName.trim()}
                  onClick={handleAddSupplier}
                >
                  {savingSupplier ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
