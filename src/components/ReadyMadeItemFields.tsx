"use client";

import { useEffect, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { http } from "@/lib/http";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { formatBRLInputDisplay, parseBRLMoneyInput } from "@/lib/inputMasks";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;
type SupplierOption = { value: string; label: string };

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

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierTaxId, setNewSupplierTaxId] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    const ready = productRow?.sourceType === "ready_made";
    setIsReadyMade(ready);
    const supId = productRow?.supplierId != null ? String(productRow.supplierId) : "";
    const supName = productRow?.supplierName != null ? String(productRow.supplierName) : "";
    setSupplierOpt(supId ? { value: supId, label: supName || supId } : null);
    const cost = productRow?.costPrice;
    setCostPriceInput(typeof cost === "number" ? cost.toFixed(2) : "");
    const markup = productRow?.markupPercent;
    setMarkupPercentInput(markup != null && markup !== "" ? String(markup) : "");
  }, [resetKey, productRow]);

  const costPrice = costPriceInput ? Number(parseBRLMoneyInput(costPriceInput)) || 0 : 0;
  const markupPercent = markupPercentInput ? Number(markupPercentInput) || 0 : 0;
  const computedPrice = Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current({
      isReadyMade,
      supplierId: supplierOpt?.value || "",
      costPrice,
      markupPercent,
      computedPrice,
    });
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
        <input type="checkbox" className="w-4 h-4" checked={isReadyMade} onChange={(e) => setIsReadyMade(e.target.checked)} />
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
              onChange={(e) => setCostPriceInput(parseBRLMoneyInput(e.target.value))}
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
              onChange={(e) => setMarkupPercentInput(e.target.value)}
              placeholder="Ex.: 50"
            />
          </label>

          <div className="text-sm space-y-1">
            <span style={{ color: lmfitTokens.textMuted }}>Preço de venda calculado</span>
            <p className="min-h-10 flex items-center font-semibold tabular-nums" style={{ color: lmfitTokens.success }}>
              {formatBRL(computedPrice)}
            </p>
          </div>
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
