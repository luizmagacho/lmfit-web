/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { axiosErrorMessage } from "@/lib/apiErrors";
import { http } from "@/lib/http";
import {
  collectVariantOptionsFromProducts,
  documentId,
  extractListItems,
} from "@/lib/normalizeApiList";
import { createPurchase, getPurchase, updatePurchase } from "@/lib/purchases/purchasesApi";
import { generateSkuSuggestion } from "@/components/ProductVariantsEditor";

import { lmfitTokens } from "@/theme/tokens";
import AsyncCreatableSelect from "react-select/async-creatable";
import AsyncSelect from "react-select/async";

type SupplierRow = { _id: string; name?: string };
type VariantOpt = { id: string; label: string; sku: string };

type LocalLine = {
  key: string;
  itemType: 'variant' | 'material';
  variantId: string;
  materialId: string;
  rawName: string;
  unitPrice: string;
  quantityOrdered: string;
  quantityReceived: string;
  /** Quando true, este item ainda não existe como ProductVariant — será criado ao salvar. */
  isNewVariant: boolean;
  newProductId: string;
  newProductLabel: string;
  newColor: string;
  newSize: string;
  newSku: string;
  newPrice: string;
};
type MaterialOpt = { id: string; name: string; unit: string };


function floatToBRL(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maskBRL(value: string) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const amount = parseInt(digits, 10) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRL(value: string) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
function emptyLine(key: string): LocalLine {
  return {
    key,
    itemType: 'variant',
    variantId: "",
    materialId: "",
    rawName: "",
    unitPrice: floatToBRL(0),
    quantityOrdered: "1",
    quantityReceived: "",
    isNewVariant: false,
    newProductId: "",
    newProductLabel: "",
    newColor: "",
    newSize: "",
    newSku: "",
    newPrice: "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function linesToLocal(lines: any[], nextKey: () => string): LocalLine[] {
  if (!lines.length) return [emptyLine(nextKey())];
  return lines.map((l) => ({
    key: nextKey(),
    itemType: l.materialId ? 'material' : 'variant',
    variantId: l.variantId ? String(l.variantId) : "",
    materialId: l.materialId ? String(l.materialId) : "",
    rawName: l.rawName ? String(l.rawName) : "",
    unitPrice: l.unitPrice != null ? floatToBRL(l.unitPrice) : floatToBRL(0),
    quantityOrdered: String(l.quantityOrdered),
    quantityReceived:
      l.quantityReceived != null && Number.isFinite(l.quantityReceived) ? String(l.quantityReceived) : "",
    // Uma compra já salva sempre referencia uma variante real (o servidor resolve
    // `newVariant` no momento de salvar) — o modo "nova variação" só existe no rascunho local.
    isNewVariant: false,
    newProductId: "",
    newProductLabel: "",
    newColor: "",
    newSize: "",
    newSku: "",
    newPrice: "",
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLinesPayload(rows: LocalLine[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const r of rows) {
    if (r.itemType === 'variant' && r.isNewVariant) {
      if (!r.newProductId.trim() || !r.newSku.trim()) continue;
    } else if (r.itemType === 'variant' && !r.variantId.trim() && !r.rawName.trim()) {
      continue;
    } else if (r.itemType === 'material' && !r.materialId.trim() && !r.rawName.trim()) {
      continue;
    }

    const quantityOrdered = Number(String(r.quantityOrdered).replace(",", "."));
    const unitPrice = parseBRL(r.unitPrice);
    const qrRaw = r.quantityReceived.trim();
    const quantityReceived = qrRaw === "" ? undefined : Number(qrRaw.replace(",", "."));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line: any = {
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      quantityOrdered: Number.isFinite(quantityOrdered) ? quantityOrdered : 0,
      quantityReceived: quantityReceived !== undefined && Number.isFinite(quantityReceived) ? quantityReceived : undefined,
    };
    if (r.itemType === 'variant' && r.isNewVariant) {
      line.newVariant = {
        productId: r.newProductId.trim(),
        sku: r.newSku.trim(),
        color: r.newColor.trim() || undefined,
        size: r.newSize.trim() || undefined,
        price: r.newPrice.trim() ? parseBRL(r.newPrice) : undefined,
      };
    } else if (r.itemType === 'variant') {
      if (r.variantId) line.variantId = r.variantId.trim();
      else line.rawName = r.rawName.trim();
    } else {
      if (r.materialId) line.materialId = r.materialId.trim();
      else line.rawName = r.rawName.trim();
    }
    out.push(line);
  }
  return out;
}

export function PurchaseEditorClient({ purchaseId }: { purchaseId: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVariantId = searchParams.get("variantId")?.trim() ?? "";

  const [loading, setLoading] = useState(Boolean(purchaseId));
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [supplierOpt, setSupplierOpt] = useState<{value: string, label: string} | null>(null);
  const supplierId = supplierOpt?.value || "";
  const [status, setStatus] = useState("pending");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const keyBase = useId();
  const keySeqRef = useRef(0);
  const nextKey = useCallback(() => {
    keySeqRef.current += 1;
    return `${keyBase}-pl-${keySeqRef.current}`;
  }, [keyBase]);
  const [lines, setLines] = useState<LocalLine[]>(() => [emptyLine(`${keyBase}-pl-0`)]);

  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierTaxId, setNewSupplierTaxId] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: '2.75rem',
      borderRadius: '0.375rem',
      borderColor: lmfitTokens.border,
      backgroundColor: 'var(--card-bg)',
      color: lmfitTokens.text,
    }),
    singleValue: (base: any) => ({ ...base, color: lmfitTokens.text }),
    input: (base: any) => ({ ...base, color: lmfitTokens.text }),
    menu: (base: any) => ({ ...base, zIndex: 50, backgroundColor: 'var(--card-bg)' }),
    option: (base: any, state: { isFocused: boolean }) => ({
      ...base,
      backgroundColor: state.isFocused ? lmfitTokens.accentBlue + '20' : 'transparent',
      color: lmfitTokens.text,
      cursor: 'pointer'
    }),
  };

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
      const newSup = { value: String(res.data._id), label: res.data.name };
      setSupplierOpt(newSup);
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


  const loadSupplierOptions = async (inputValue: string) => {
    try {
      const { data } = await http.get<unknown>("/suppliers", { params: { page: 1, limit: 50, search: inputValue } });
      const items = extractListItems(data);
      return items
        .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
        .map((row) => ({
          value: String(documentId(row)),
          label: row.name != null ? String(row.name) : String(documentId(row)),
        }))
        .filter((s) => s.value !== "undefined");
    } catch {
      return [];
    }
  };

  const loadVariantOptions = async (inputValue: string) => {
    try {
      const { data } = await http.get<unknown>("/products", { params: { page: 1, limit: 50, search: inputValue } });
      const items = extractListItems(data);
      const rows = collectVariantOptionsFromProducts(items);
      return rows.map((r) => ({ value: r.id, label: r.label }));
    } catch {
      return [];
    }
  };

  /** Nível produto (não variante) — usado pra "nova variação", que cria a ProductVariant ao salvar. */
  const loadNewVariantProductOptions = async (inputValue: string) => {
    try {
      const { data } = await http.get<unknown>("/products", { params: { page: 1, limit: 50, search: inputValue } });
      const items = extractListItems(data) as Array<Record<string, unknown>>;
      return items.map((p) => ({
        value: String(documentId(p)),
        label: String(p.name ?? documentId(p)),
        priceRetail: typeof p.priceRetail === "number" ? p.priceRetail : typeof p.price === "number" ? p.price : undefined,
      }));
    } catch {
      return [];
    }
  };

  const loadMaterialOptions = async (inputValue: string) => {
    try {
      const { data } = await http.get<unknown>("/materials", { params: { page: 1, limit: 50, search: inputValue } });
      const items = extractListItems(data) as any[];
      return items.map((m) => ({ value: m._id, label: `${m.name} (${m.unit || 'un'})` }));
    } catch {
      return [];
    }
  };


  useEffect(() => {
    if (!purchaseId) {
      if (presetVariantId) {
        setLines([
          {
            ...emptyLine(nextKey()),
            variantId: presetVariantId,
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
        const p = await getPurchase(purchaseId);
        if (cancelled) return;
        const supplierName = (p as any).supplierName;
        // `supplierId` comes back as a plain ObjectId string (not populated) — `documentId`
        // only extracts `_id`/`id` from an object and returns "" for a bare string, which
        // silently emptied the supplier field on every edit load and blocked saving
        // (the form requires a supplier). Use the string directly when it already is one.
        const supplierIdValue =
          typeof p.supplierId === "string" ? p.supplierId : documentId(p.supplierId);
        setSupplierOpt(
          supplierIdValue ? { value: supplierIdValue, label: supplierName ? String(supplierName) : supplierIdValue } : null,
        );
        setStatus(p.status ? String(p.status) : "pending");
        setReference(p.reference != null ? String(p.reference) : "");
        setNotes(p.notes != null ? String(p.notes) : "");
        setLines(linesToLocal(Array.isArray(p.lines) ? p.lines : [], nextKey));
      } catch (e) {
        if (!cancelled) setLoadErr(axiosErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchaseId, presetVariantId, nextKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveErr(null);
    setSuccessMsg(null);

    if (!supplierId.trim()) {
      setSaveErr("Selecione o fornecedor.");
      return;
    }

    const payloadLines = parseLinesPayload(lines);
    if (!purchaseId && payloadLines.length === 0) {
      setSaveErr("Inclua ao menos um item.");
      return;
    }
    if (purchaseId && payloadLines.length === 0) {
      setSaveErr("Inclua ao menos um item.");
      return;
    }

    setSaving(true);
    try {
      if (!purchaseId) {
        const created = await createPurchase({
          supplierId: supplierId.trim(),
          status,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          lines: payloadLines,
        });
        router.replace(`/purchases/${encodeURIComponent(String(created._id))}`);
        return;
      }
      await updatePurchase(purchaseId, {
        supplierId: supplierId.trim(),
        status,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        lines: payloadLines,
      });
      setSuccessMsg("Compra atualizada.");
    } catch (e) {
      setSaveErr(isAxiosError(e) ? JSON.stringify((e as any).response?.data || e.message) : "Não foi possível salvar.");
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

  return (
    <>
      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          {purchaseId ? "Editar compra" : "Nova compra ao fornecedor"}
        </h1>
        <Link
          href="/purchases"
          className="text-sm min-h-11 inline-flex items-center px-3 rounded-md border touch-manipulation"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          Voltar à lista
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

      {saveErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {saveErr}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Fornecedor *</span>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AsyncSelect
                cacheOptions
                          
                defaultOptions
                loadOptions={loadSupplierOptions}
                styles={selectStyles}
                placeholder="Selecione o fornecedor..."
                value={supplierOpt}
                onChange={(opt: any) => setSupplierOpt(opt)}
              />
            </div>
            <button
              type="button"
              className="min-h-11 px-3 border rounded-md text-sm whitespace-nowrap"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
              onClick={() => setShowSupplierModal(true)}
            >
              + Novo
            </button>
          </div>
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Status</span>
          <select
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="pending">Pendente</option>
            <option value="started">Iniciado</option>
            <option value="completed">Finalizado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Referência</span>
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>

        <label className="block text-sm space-y-1 sm:col-span-2">
          <span style={{ color: lmfitTokens.textMuted }}>Observações</span>
          <textarea
            className="w-full border rounded-md px-3 py-2 min-h-[4.5rem] bg-[var(--card-bg)] text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
            Linhas
          </h2>

        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: lmfitTokens.border }}>
                <th className="py-2 pr-2 font-medium w-24" style={{ color: lmfitTokens.accentBlue }}>Tipo</th>
                <th className="py-2 pr-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Item</th>
                <th className="py-2 pr-2 font-medium w-24" style={{ color: lmfitTokens.accentBlue }}>Preço Un.</th>
                <th className="py-2 pr-2 font-medium w-24" style={{ color: lmfitTokens.accentBlue }}>Qtd pedida</th>
                <th className="py-2 pr-2 font-medium w-32" style={{ color: lmfitTokens.accentBlue }}>
                  Qtd recebida
                </th>
                <th className="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.key} className="border-b align-top" style={{ borderColor: lmfitTokens.border }}>
                                    <td className="py-2 pr-2">
                    <select
                      className="w-full border rounded-md px-2 py-2 min-h-11 bg-[var(--card-bg)]"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      value={row.itemType}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === row.key ? { ...l, itemType: e.target.value as 'variant' | 'material' } : l)),
                        )
                      }
                    >
                      <option value="variant">Peça</option>
                      <option value="material">Insumo</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    {row.itemType === 'variant' && row.isNewVariant ? (
                      <div className="w-full min-w-[16rem] space-y-1.5 p-2 rounded-md border" style={{ borderColor: lmfitTokens.border }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: lmfitTokens.textMuted }}>
                            Nova variação (cor/tamanho)
                          </span>
                          <button
                            type="button"
                            className="text-xs underline"
                            style={{ color: lmfitTokens.textMuted }}
                            onClick={() =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === row.key
                                    ? { ...l, isNewVariant: false, newProductId: "", newProductLabel: "", newColor: "", newSize: "", newSku: "", newPrice: "" }
                                    : l,
                                ),
                              )
                            }
                          >
                            Cancelar
                          </button>
                        </div>
                        <AsyncSelect
                          cacheOptions
                          defaultOptions
                          loadOptions={loadNewVariantProductOptions}
                          styles={selectStyles}
                          placeholder="Produto já cadastrado…"
                          value={row.newProductId ? { value: row.newProductId, label: row.newProductLabel } : null}
                          onChange={(opt: any) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === row.key
                                  ? {
                                      ...l,
                                      newProductId: opt?.value ?? "",
                                      newProductLabel: opt?.label ?? "",
                                      newSku: generateSkuSuggestion(opt?.label ?? "", l.newColor, l.newSize),
                                      newPrice:
                                        !l.newPrice && typeof opt?.priceRetail === "number" ? floatToBRL(opt.priceRetail) : l.newPrice,
                                    }
                                  : l,
                              ),
                            )
                          }
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            className="w-full border rounded px-2 py-1.5 min-h-9 text-sm"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
                            placeholder="Cor"
                            value={row.newColor}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === row.key
                                    ? { ...l, newColor: e.target.value, newSku: generateSkuSuggestion(l.newProductLabel, e.target.value, l.newSize) }
                                    : l,
                                ),
                              )
                            }
                          />
                          <input
                            className="w-full border rounded px-2 py-1.5 min-h-9 text-sm"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
                            placeholder="Tamanho"
                            value={row.newSize}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((l) =>
                                  l.key === row.key
                                    ? { ...l, newSize: e.target.value, newSku: generateSkuSuggestion(l.newProductLabel, l.newColor, e.target.value) }
                                    : l,
                                ),
                              )
                            }
                          />
                        </div>
                        <input
                          className="w-full border rounded px-2 py-1.5 min-h-9 text-sm font-mono"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
                          placeholder="SKU"
                          value={row.newSku}
                          onChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, newSku: e.target.value } : l)))}
                        />
                        <input
                          inputMode="decimal"
                          className="w-full border rounded px-2 py-1.5 min-h-9 text-sm tabular-nums"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}
                          placeholder="Preço de venda (R$)"
                          value={row.newPrice}
                          onChange={(e) => setLines((prev) => prev.map((l) => (l.key === row.key ? { ...l, newPrice: maskBRL(e.target.value) } : l)))}
                        />
                      </div>
                    ) : row.itemType === 'variant' ? (
                      <div className="w-full min-w-[14rem] space-y-1">
                        <AsyncCreatableSelect
                          isClearable
                          cacheOptions
                          createOptionPosition="first"
                          defaultOptions
                          loadOptions={loadVariantOptions}
                          styles={selectStyles}
                          placeholder="Selecione a peça…"
                          formatCreateLabel={(val) => `Criar "${val}"`}
                          value={row.variantId ? { value: row.variantId, label: row.variantId } : row.rawName ? { value: row.rawName, label: row.rawName } : null}
                          onChange={(opt: any) => {
                            if (!opt) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, variantId: "", rawName: "" } : l));
                            } else if (opt.__isNew__) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, variantId: "", rawName: opt.value } : l));
                            } else {
                              // We just store the ID in lines. To show label on re-render properly, we could cache it, but react-select keeps it if we don't unmount, and AsyncCreatable updates it.
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, variantId: opt.value, rawName: "" } : l));
                            }
                          }}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            if (val && !row.variantId && row.rawName !== val) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, variantId: "", rawName: val } : l));
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="text-xs underline"
                          style={{ color: lmfitTokens.primary }}
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((l) => (l.key === row.key ? { ...l, isNewVariant: true, variantId: "", rawName: "" } : l)),
                            )
                          }
                        >
                          + Nova variação (cor/tamanho)
                        </button>
                      </div>
                    ) : (
                      <div className="w-full min-w-[14rem]">
                        <AsyncCreatableSelect
                          isClearable
                          cacheOptions
                          createOptionPosition="first"
                          defaultOptions
                          loadOptions={loadMaterialOptions}
                          styles={selectStyles}
                          placeholder="Selecione o insumo…"
                          formatCreateLabel={(val) => `Criar "${val}"`}
                          value={row.materialId ? { value: row.materialId, label: row.materialId } : row.rawName ? { value: row.rawName, label: row.rawName } : null}
                          onChange={(opt: any) => {
                            if (!opt) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, materialId: "", rawName: "" } : l));
                            } else if (opt.__isNew__) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, materialId: "", rawName: opt.value } : l));
                            } else {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, materialId: opt.value, rawName: "" } : l));
                            }
                          }}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            if (val && !row.materialId && row.rawName !== val) {
                              setLines(prev => prev.map(l => l.key === row.key ? { ...l, materialId: "", rawName: val } : l));
                            }
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-full border rounded-md px-2 py-2 min-h-11 tabular-nums"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      value={row.unitPrice}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === row.key ? { ...l, unitPrice: maskBRL(e.target.value) } : l)),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-full border rounded-md px-2 py-2 min-h-11 tabular-nums"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      value={row.quantityOrdered}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === row.key ? { ...l, quantityOrdered: e.target.value } : l)),
                        )
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      className="w-full border rounded-md px-2 py-2 min-h-11 tabular-nums"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      value={row.quantityReceived}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === row.key ? { ...l, quantityReceived: e.target.value } : l)),
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
      </div>

      <button
        type="submit"
        disabled={saving}
        className="min-h-11 px-5 rounded-md text-sm font-medium text-white disabled:opacity-60 touch-manipulation"
        style={{ backgroundColor: lmfitTokens.primary }}
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </form>

    {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-[var(--card-bg)] rounded-xl shadow-lg p-5 w-full max-w-sm" style={{ color: lmfitTokens.text }}>
            <h3 className="text-lg font-medium mb-4">Novo fornecedor</h3>
            <div className="space-y-3">
              <label className="block text-sm">
                Nome *
                <input required className="w-full border rounded-md mt-1 px-3 py-2" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} />
              </label>
              <label className="block text-sm">
                CNPJ
                <input className="w-full border rounded-md mt-1 px-3 py-2" value={newSupplierTaxId} onChange={e => setNewSupplierTaxId(e.target.value)} />
              </label>
              <label className="block text-sm">
                Telefone
                <input className="w-full border rounded-md mt-1 px-3 py-2" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} />
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" className="flex-1 border rounded-md py-2" onClick={() => setShowSupplierModal(false)}>Cancelar</button>
                <button type="button" className="flex-1 rounded-md py-2 text-white" style={{ background: lmfitTokens.primary }} disabled={savingSupplier || !newSupplierName.trim()} onClick={handleAddSupplier}>{savingSupplier ? "Salvando..." : "Salvar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
