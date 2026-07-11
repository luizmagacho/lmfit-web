"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2, PackageSearch } from "lucide-react";
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

type StockBreakdownRow = {
  locationId: string;
  locationName: string;
  isDefault: boolean;
  quantity: number;
};

function flattenVariants(products: Array<Record<string, unknown>>): VariantOption[] {
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

function TransferPanel() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [variantId, setVariantId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [breakdown, setBreakdown] = useState<StockBreakdownRow[] | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void http.get<{ items: LocationRow[] }>("/locations").then((res) => setLocations(res.data.items ?? []));
    void http.get<{ items: Array<Record<string, unknown>> }>("/products", { params: { limit: 500 } }).then((res) => {
      setVariants(flattenVariants(res.data.items ?? []));
    });
  }, []);

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
    if (fromLocationId === toLocationId) {
      setMessage({ type: "error", text: "Origem e destino não podem ser o mesmo local." });
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

export function LocationsClient() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Locais de estoque
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Cadastre depósitos e lojas físicas, e transfira estoque entre eles. O local
          &quot;Loja Principal&quot; é criado automaticamente e concentra o estoque existente.
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
          { key: "isDefault", label: "Padrão", fieldType: "checkbox", editable: false },
          { key: "active", label: "Ativo", fieldType: "checkbox", defaultValue: "true" },
        ]}
        tableColumns={["name", "address", "isDefault", "active"]}
      />

      <TransferPanel />
    </div>
  );
}
