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
import { normalizePurchaseLines } from "@/lib/purchases/normalizeLines";
import { createPurchase, getPurchase, updatePurchase } from "@/lib/purchases/purchasesApi";
import type { PurchaseLineInput } from "@/lib/purchases/types";
import { lmfitTokens } from "@/theme/tokens";

type SupplierRow = { _id: string; name?: string };
type VariantOpt = { id: string; label: string; sku: string };

type LocalLine = {
  key: string;
  itemType: 'variant' | 'material';
  variantId: string;
  materialId: string;
  unitPrice: string;
  quantityOrdered: string;
  quantityReceived: string;
};
type MaterialOpt = { id: string; name: string; unit: string };

function emptyLine(key: string): LocalLine {
  return { key, itemType: 'variant', variantId: "", materialId: "", unitPrice: "0", quantityOrdered: "1", quantityReceived: "" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function linesToLocal(lines: any[], nextKey: () => string): LocalLine[] {
  if (!lines.length) return [emptyLine(nextKey())];
  return lines.map((l) => ({
    key: nextKey(),
    itemType: l.materialId ? 'material' : 'variant',
    variantId: l.variantId ? String(l.variantId) : "",
    materialId: l.materialId ? String(l.materialId) : "",
    unitPrice: l.unitPrice != null ? String(l.unitPrice) : "0",
    quantityOrdered: String(l.quantityOrdered),
    quantityReceived:
      l.quantityReceived != null && Number.isFinite(l.quantityReceived) ? String(l.quantityReceived) : "",
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLinesPayload(rows: LocalLine[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = [];
  for (const r of rows) {
    if (r.itemType === 'variant' && !r.variantId.trim()) continue;
    if (r.itemType === 'material' && !r.materialId.trim()) continue;
    
    const quantityOrdered = Number(String(r.quantityOrdered).replace(",", "."));
    const unitPrice = Number(String(r.unitPrice).replace(",", "."));
    const qrRaw = r.quantityReceived.trim();
    const quantityReceived = qrRaw === "" ? undefined : Number(qrRaw.replace(",", "."));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line: any = {
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      quantityOrdered: Number.isFinite(quantityOrdered) ? quantityOrdered : 0,
      quantityReceived: quantityReceived !== undefined && Number.isFinite(quantityReceived) ? quantityReceived : undefined,
    };
    if (r.itemType === 'variant') {
      line.variantId = r.variantId.trim();
    } else {
      line.materialId = r.materialId.trim();
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
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [variantOpts, setVariantOpts] = useState<VariantOpt[]>([]);
  const [materialOpts, setMaterialOpts] = useState<MaterialOpt[]>([]);
  const [variantFilter, setVariantFilter] = useState("");

  const [supplierId, setSupplierId] = useState("");
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

  const filteredVariants = useMemo(() => {
    const q = variantFilter.trim().toLowerCase();
    if (!q) return variantOpts;
    return variantOpts.filter((v) => v.label.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q));
  }, [variantOpts, variantFilter]);

  const filteredMaterials = useMemo(() => {
    const q = variantFilter.trim().toLowerCase();
    if (!q) return materialOpts;
    return materialOpts.filter((m) => m.name.toLowerCase().includes(q));
  }, [materialOpts, variantFilter]);

  const loadMaterials = useCallback(async () => {
    try {
      const { data } = await http.get<unknown>("/materials", { params: { page: 1, limit: 500 } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = extractListItems(data) as any[];
      setMaterialOpts(items.map((m) => ({ id: m._id, name: m.name, unit: m.unit })));
    } catch {
      setMaterialOpts([]);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await http.get<unknown>("/products", { params: { page: 1, limit: 200 } });
      const items = extractListItems(data);
      const rows = collectVariantOptionsFromProducts(items);
      setVariantOpts(rows.map((r) => ({ id: r.id, sku: r.sku, label: r.label })));
    } catch {
      setVariantOpts([]);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const { data } = await http.get<unknown>("/suppliers", { params: { page: 1, limit: 500 } });
      const items = extractListItems(data);
      setSuppliers(
        items
          .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
          .map((row) => ({
            _id: documentId(row),
            name: row.name != null ? String(row.name) : undefined,
          }))
          .filter((s) => s._id),
      );
    } catch {
      setSuppliers([]);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    void loadSuppliers();
    void loadMaterials();
  }, [loadCatalog, loadSuppliers, loadMaterials]);

  useEffect(() => {
    if (!purchaseId) {
      if (presetVariantId) {
        setLines([
          {
            key: nextKey(),
            itemType: 'variant',
            variantId: presetVariantId,
            materialId: "",
            unitPrice: "0",
            quantityOrdered: "1",
            quantityReceived: "",
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
        setSupplierId(p.supplierId ? String(p.supplierId) : "");
        setStatus(p.status ? String(p.status) : "pending");
        setReference(p.reference != null ? String(p.reference) : "");
        setNotes(p.notes != null ? String(p.notes) : "");
        setLines(linesToLocal(normalizePurchaseLines(p.lines), nextKey));
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
      setSaveErr(isAxiosError(e) ? axiosErrorMessage(e) : "Não foi possível salvar.");
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
          <select
            required
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name?.trim() ? `${s.name} (${s._id})` : s._id}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm space-y-1">
          <span style={{ color: lmfitTokens.textMuted }}>Status</span>
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="pending"
          />
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
          <input
            type="search"
            className="text-sm min-h-9 max-w-xs border rounded-md px-2 py-1 flex-1"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Filtrar variantes…"
            value={variantFilter}
            onChange={(e) => setVariantFilter(e.target.value)}
          />
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
                    {row.itemType === 'variant' ? (
                      <select
                        className="w-full min-w-[12rem] border rounded-md px-2 py-2 min-h-11 bg-[var(--card-bg)]"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        value={row.variantId}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) => (l.key === row.key ? { ...l, variantId: e.target.value } : l)),
                          )
                        }
                      >
                        <option value="">Selecione a peça…</option>
                        {filteredVariants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="w-full min-w-[12rem] border rounded-md px-2 py-2 min-h-11 bg-[var(--card-bg)]"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        value={row.materialId}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) => (l.key === row.key ? { ...l, materialId: e.target.value } : l)),
                          )
                        }
                      >
                        <option value="">Selecione o insumo…</option>
                        {filteredMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.unit || 'un'})
                          </option>
                        ))}
                      </select>
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
                          prev.map((l) => (l.key === row.key ? { ...l, unitPrice: e.target.value } : l)),
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
  );
}
