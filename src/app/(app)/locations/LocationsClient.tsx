"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Boxes, Layers, Loader2, PackageSearch, Table2, X } from "lucide-react";
import { ResourceList } from "@/components/ResourceList";
import { http } from "@/lib/http";
import { lmfitTokens } from "@/theme/tokens";

type LocationRow = {
  _id: string;
  name: string;
  isDefault?: boolean;
};

type VariantOption = {
  variantId: string;
  label: string;
};

type ProductOption = {
  productId: string;
  name: string;
  variants: Array<{ variantId: string; sku: string; color?: string; size?: string }>;
};

type StockMatrixItem = {
  variantId: string;
  sku: string;
  displayName: string;
  byLocation: Record<string, number>;
  total: number;
};

type StockBreakdownRow = {
  locationId: string;
  locationName: string;
  isDefault: boolean;
  quantity: number;
};

type AllocatedStockRow = {
  variantId: string;
  sku: string;
  productName: string;
  color?: string;
  size?: string;
  /** "Produto — Cor — Tamanho" — o back-end já concatena; várias variantes do mesmo
   *  produto viravam linhas indistinguíveis sem isso (só o SKU cru diferenciava). */
  displayName?: string;
  quantity: number;
};

export function flattenVariants(products: Array<Record<string, unknown>>): VariantOption[] {
  const out: VariantOption[] = [];
  for (const p of products) {
    const name = String(p.name ?? "");
    const variants = Array.isArray(p.variants) ? (p.variants as Array<Record<string, unknown>>) : [];
    for (const v of variants) {
      const id = String(v._id ?? "");
      if (!id) continue;
      const variation = [v.color, v.size].filter(Boolean).join("/");
      out.push({ variantId: id, label: `${name}${variation ? ` — ${variation}` : ""} (${v.sku ?? ""})` });
    }
  }
  return out;
}

export function flattenProducts(products: Array<Record<string, unknown>>): ProductOption[] {
  const out: ProductOption[] = [];
  for (const p of products) {
    const productId = String(p._id ?? "");
    const name = String(p.name ?? "");
    const variants = Array.isArray(p.variants) ? (p.variants as Array<Record<string, unknown>>) : [];
    if (!productId || !variants.length) continue;
    out.push({
      productId,
      name,
      variants: variants
        .filter((v) => v._id)
        .map((v) => ({
          variantId: String(v._id),
          sku: String(v.sku ?? ""),
          color: v.color ? String(v.color) : undefined,
          size: v.size ? String(v.size) : undefined,
        })),
    });
  }
  return out;
}

/** The only real validation rule for a transfer besides required-fields: can't move stock
 * from a location to itself. Required-fields are just a silent no-op in the form, not an
 * error message, so they're not part of this. */
export function transferErrorMessage(fromLocationId: string, toLocationId: string): string | null {
  if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
    return "Origem e destino não podem ser o mesmo local.";
  }
  return null;
}

function TransferPanel({ locations, variants }: { locations: LocationRow[]; variants: VariantOption[] }) {
  const [variantId, setVariantId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [breakdown, setBreakdown] = useState<StockBreakdownRow[] | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!variantId) {
      setBreakdown(null);
      return;
    }
    setLoadingBreakdown(true);
    http
      .get<StockBreakdownRow[]>(`/locations/stock/${variantId}`)
      .then((res) => setBreakdown(res.data))
      .catch(() => setBreakdown([]))
      .finally(() => setLoadingBreakdown(false));
  }, [variantId, submitting]);

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!variantId || !fromLocationId || !toLocationId || quantity < 1) return;
    const transferError = transferErrorMessage(fromLocationId, toLocationId);
    if (transferError) {
      setMessage({ type: "error", text: transferError });
      return;
    }
    setSubmitting(true);
    try {
      await http.post("/locations/transfer", {
        variantId,
        fromLocationId,
        toLocationId,
        quantity,
      });
      setMessage({ type: "success", text: `${quantity} unidade(s) transferida(s) com sucesso.` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Erro ao transferir estoque." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Transferência de estoque entre locais
        </h2>
      </div>

      <form onSubmit={handleTransfer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
          Produto / variante
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione…</option>
            {variants.map((v) => (
              <option key={v.variantId} value={v.variantId}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          De (origem)
          <select
            value={fromLocationId}
            onChange={(e) => setFromLocationId(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione…</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
                {l.isDefault ? " (padrão)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Para (destino)
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione…</option>
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
                {l.isDefault ? " (padrão)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Quantidade
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </label>

        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {message ? (
            <p className="text-xs" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
              {message.text}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting || !variantId || !fromLocationId || !toLocationId}
            className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Transferir
          </button>
        </div>
      </form>

      {variantId ? (
        <div className="border-t pt-3" style={{ borderColor: lmfitTokens.border }}>
          <div className="flex items-center gap-2 mb-2">
            <PackageSearch className="h-4 w-4" style={{ color: lmfitTokens.textMuted }} />
            <span className="text-xs font-medium" style={{ color: lmfitTokens.textMuted }}>
              Estoque atual por local
            </span>
          </div>
          {loadingBreakdown ? (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Carregando…
            </p>
          ) : breakdown && breakdown.length ? (
            <ul className="text-xs space-y-1">
              {breakdown.map((b) => (
                <li key={b.locationId} className="flex justify-between" style={{ color: lmfitTokens.text }}>
                  <span>
                    {b.locationName}
                    {b.isDefault ? " (padrão)" : ""}
                  </span>
                  <span className="tabular-nums font-medium">{b.quantity} un.</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Sem estoque registrado em nenhum local.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Alocar = mover do pool central (local padrão) para um local específico — a ação que a
 *  maioria dos admins vai usar no dia a dia; não expõe o conceito de "local padrão", o
 *  backend resolve a origem sozinho (`POST /locations/allocate`). */
function AllocatePanel({
  locations,
  variants,
  onAllocated,
}: {
  locations: LocationRow[];
  variants: VariantOption[];
  onAllocated: () => void;
}) {
  const [variantId, setVariantId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const targetOptions = locations.filter((l) => !l.isDefault);

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!variantId || !toLocationId || quantity < 1) return;
    setSubmitting(true);
    try {
      await http.post("/locations/allocate", { variantId, toLocationId, quantity });
      setMessage({ type: "success", text: `${quantity} unidade(s) alocada(s) com sucesso.` });
      onAllocated();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Erro ao alocar estoque." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Alocar estoque para um local
        </h2>
      </div>
      <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
        Move estoque do pool central (Loja Principal) para a fatia fixa de um local — é o que
        aquele local (e, no PDV offline, o funcionário atribuído a ele) pode vender.
      </p>

      <form onSubmit={handleAllocate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
          Produto / variante
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione…</option>
            {variants.map((v) => (
              <option key={v.variantId} value={v.variantId}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Alocar para
          <select
            value={toLocationId}
            onChange={(e) => setToLocationId(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione…</option>
            {targetOptions.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Quantidade
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </label>

        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {message ? (
            <p className="text-xs" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
              {message.text}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting || !variantId || !toLocationId}
            className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
            Alocar
          </button>
        </div>
      </form>
    </div>
  );
}

/** Tabela do que um local específico tem alocado hoje — mesma fonte (`GET /locations/:id/stock`)
 *  que o PDV offline vai usar como foto de catálogo do local (Loop 3). */
function AllocatedStockPanel({ locations, reloadKey }: { locations: LocationRow[]; reloadKey: number }) {
  const nonDefault = locations.filter((l) => !l.isDefault);
  const [locationId, setLocationId] = useState("");
  const [rows, setRows] = useState<AllocatedStockRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!locationId && nonDefault.length) {
      setLocationId(nonDefault[0]._id);
    }
    // Only auto-select once locations first arrive; never overrides a user's own choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonDefault.length]);

  useEffect(() => {
    if (!locationId) {
      setRows([]);
      return;
    }
    setLoading(true);
    http
      .get<{ items: AllocatedStockRow[] }>(`/locations/${locationId}/stock`, { params: { limit: 200 } })
      .then((res) => setRows(res.data.items ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [locationId, reloadKey]);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <PackageSearch className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Estoque alocado por local
        </h2>
      </div>

      {nonDefault.length === 0 ? (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Cadastre um local (além da Loja Principal) para ver o estoque alocado a ele.
        </p>
      ) : (
        <>
          <label className="text-xs block max-w-xs" style={{ color: lmfitTokens.textMuted }}>
            Local
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              {nonDefault.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          {loading ? (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Carregando…
            </p>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                    <th className="px-2 py-1.5 font-medium" style={{ color: lmfitTokens.textMuted }}>
                      Produto
                    </th>
                    <th className="px-2 py-1.5 font-medium" style={{ color: lmfitTokens.textMuted }}>
                      SKU
                    </th>
                    <th className="px-2 py-1.5 font-medium text-right" style={{ color: lmfitTokens.textMuted }}>
                      Quantidade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.variantId} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                      <td className="px-2 py-1.5" style={{ color: lmfitTokens.text }}>
                        {r.displayName || r.productName}
                      </td>
                      <td className="px-2 py-1.5" style={{ color: lmfitTokens.text }}>
                        {r.sku}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium" style={{ color: lmfitTokens.text }}>
                        {r.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Nenhum estoque alocado a este local ainda.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** "Onde está cada peça" numa grade só — todas as variantes de todos os produtos, todos os
 *  locais lado a lado. Antes só dava pra ver um local por vez (`AllocatedStockPanel`); pra
 *  saber se uma peça também estava em outro local era preciso trocar o filtro e comparar de
 *  cabeça. */
function StockMatrixPanel({ locations, reloadKey }: { locations: LocationRow[]; reloadKey: number }) {
  const [items, setItems] = useState<StockMatrixItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    http
      .get<{ locations: LocationRow[]; items: StockMatrixItem[] }>("/locations/stock-matrix")
      .then((res) => setItems(res.data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <Table2 className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Onde está cada peça
        </h2>
      </div>
      <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
        Cada linha é uma peça (cor/tamanho), cada coluna é um local — veja tudo de uma vez, sem
        trocar de filtro.
      </p>

      {loading ? (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Carregando…
        </p>
      ) : items.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                <th className="px-2 py-1.5 font-medium sticky left-0" style={{ color: lmfitTokens.textMuted, backgroundColor: "var(--card-bg)" }}>
                  Peça
                </th>
                {locations.map((l) => (
                  <th key={l._id} className="px-2 py-1.5 font-medium text-right whitespace-nowrap" style={{ color: lmfitTokens.textMuted }}>
                    {l.name}
                    {l.isDefault ? " (padrão)" : ""}
                  </th>
                ))}
                <th className="px-2 py-1.5 font-medium text-right" style={{ color: lmfitTokens.textMuted }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.variantId} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                  <td className="px-2 py-1.5 sticky left-0" style={{ color: lmfitTokens.text, backgroundColor: "var(--card-bg)" }}>
                    {r.displayName}
                    <span className="ml-1.5" style={{ color: lmfitTokens.textMuted }}>
                      ({r.sku})
                    </span>
                  </td>
                  {locations.map((l) => (
                    <td key={l._id} className="px-2 py-1.5 text-right tabular-nums" style={{ color: lmfitTokens.text }}>
                      {r.byLocation[l._id] ?? "—"}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: lmfitTokens.text }}>
                    {r.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Nenhum estoque alocado em nenhum local ainda.
        </p>
      )}
    </div>
  );
}

type BatchLine = { variantId: string; label: string; sku: string; quantity: number };

/** Transferência em lote: várias peças (tamanhos/cores diferentes, de vários produtos) numa
 *  única operação — ex.: Legging Preta P/M/G/GG + Legging Branca P/M tudo de uma vez, em vez
 *  de uma transferência por SKU. */
function BatchTransferPanel({
  locations,
  products,
  onTransferred,
}: {
  locations: LocationRow[];
  products: ProductOption[];
  onTransferred: () => void;
}) {
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [pickerProductId, setPickerProductId] = useState("");
  const [lines, setLines] = useState<BatchLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function addProduct(productId: string) {
    if (!productId) return;
    const product = products.find((p) => p.productId === productId);
    if (!product) return;
    setLines((prev) => {
      const existingIds = new Set(prev.map((l) => l.variantId));
      const additions = product.variants
        .filter((v) => !existingIds.has(v.variantId))
        .map((v) => ({
          variantId: v.variantId,
          label: [v.color, v.size].filter(Boolean).join(" — ") || v.sku,
          sku: v.sku,
          quantity: 0,
        }));
      return [...prev, ...additions];
    });
    setPickerProductId("");
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  function setQuantity(variantId: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(0, Math.floor(quantity || 0)) } : l)));
  }

  const items = lines.filter((l) => l.quantity > 0);
  const transferError = transferErrorMessage(fromLocationId, toLocationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!fromLocationId || !toLocationId || !items.length) return;
    if (transferError) {
      setMessage({ type: "error", text: transferError });
      return;
    }
    setSubmitting(true);
    try {
      await http.post("/locations/transfer-batch", {
        fromLocationId,
        toLocationId,
        items: items.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      });
      setMessage({ type: "success", text: `${items.length} peça(s) transferida(s) com sucesso.` });
      setLines([]);
      onTransferred();
    } catch (err: any) {
      const conflicts = err.response?.data?.conflicts as Array<{ variantId: string; needed: number; available: number }> | undefined;
      if (conflicts?.length) {
        const bySku = new Map(lines.map((l) => [l.variantId, l.label] as const));
        const detail = conflicts
          .map((c) => `${bySku.get(c.variantId) ?? c.variantId}: precisa ${c.needed}, tem ${c.available}`)
          .join("; ");
        setMessage({ type: "error", text: `Estoque insuficiente — ${detail}` });
      } else {
        setMessage({ type: "error", text: err.response?.data?.message || "Erro ao transferir estoque em lote." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Transferência em lote
        </h2>
      </div>
      <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
        Adicione um ou mais produtos, informe a quantidade de cada tamanho/cor, e transfira tudo
        numa única operação.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            De (origem)
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              <option value="">Selecione…</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                  {l.isDefault ? " (padrão)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Para (destino)
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              <option value="">Selecione…</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                  {l.isDefault ? " (padrão)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-xs block" style={{ color: lmfitTokens.textMuted }}>
          Adicionar produto
          <select
            value={pickerProductId}
            onChange={(e) => addProduct(e.target.value)}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">Selecione um produto para adicionar suas variantes…</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {lines.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                  <th className="px-2 py-1.5 font-medium" style={{ color: lmfitTokens.textMuted }}>
                    Peça
                  </th>
                  <th className="px-2 py-1.5 font-medium" style={{ color: lmfitTokens.textMuted }}>
                    SKU
                  </th>
                  <th className="px-2 py-1.5 font-medium text-right" style={{ color: lmfitTokens.textMuted }}>
                    Quantidade
                  </th>
                  <th className="px-2 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.variantId} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <td className="px-2 py-1.5" style={{ color: lmfitTokens.text }}>
                      {l.label}
                    </td>
                    <td className="px-2 py-1.5" style={{ color: lmfitTokens.textMuted }}>
                      {l.sku}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        value={l.quantity}
                        onChange={(e) => setQuantity(l.variantId, Number(e.target.value))}
                        className="w-20 min-h-8 border rounded px-2 py-1 text-sm text-right bg-transparent"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(l.variantId)}
                        aria-label="Remover"
                        className="p-1 rounded hover:opacity-70"
                        style={{ color: lmfitTokens.textMuted }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Nenhum produto adicionado ainda.
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          {message ? (
            <p className="text-xs" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
              {message.text}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={submitting || !fromLocationId || !toLocationId || !items.length}
            className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            Transferir {items.length > 0 ? `(${items.length})` : ""}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LocationsClient() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [allocationReloadKey, setAllocationReloadKey] = useState(0);

  useEffect(() => {
    void http.get<{ items: Array<Record<string, unknown>> }>("/products", { params: { limit: 500 } }).then((res) => {
      setVariants(flattenVariants(res.data.items ?? []));
      setProducts(flattenProducts(res.data.items ?? []));
    });
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Locais de estoque
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Cadastre depósitos e lojas físicas, e aloque/transfira estoque entre eles. O local
          &quot;Loja Principal&quot; é criado automaticamente e concentra o estoque existente.
          Marque &quot;Padrão&quot; para definir qual local é o principal.
        </p>
      </div>

      <ResourceList
        title="Locais"
        endpoint="/locations"
        excel={false}
        columns={[
          { key: "_id", label: "ID", editable: false, hiddenOnMobile: true },
          { key: "name", label: "Nome", required: true },
          { key: "address", label: "Endereço" },
          { key: "isDefault", label: "Padrão", fieldType: "checkbox", defaultValue: "false" },
          { key: "active", label: "Ativo", fieldType: "checkbox", defaultValue: "true" },
        ]}
        tableColumns={["name", "address", "isDefault", "active"]}
        onDataChange={(rows) => setLocations(rows as LocationRow[])}
      />

      <StockMatrixPanel locations={locations} reloadKey={allocationReloadKey} />

      <AllocatePanel
        locations={locations}
        variants={variants}
        onAllocated={() => setAllocationReloadKey((k) => k + 1)}
      />

      <AllocatedStockPanel locations={locations} reloadKey={allocationReloadKey} />

      <BatchTransferPanel
        locations={locations}
        products={products}
        onTransferred={() => setAllocationReloadKey((k) => k + 1)}
      />

      <TransferPanel locations={locations} variants={variants} />
    </div>
  );
}
