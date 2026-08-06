"use client";

import { useEffect, useMemo, useState } from "react";
import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { formatBRL } from "@/lib/formatMoney";
import { http } from "@/lib/http";
import { extractListItems } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

/** "10" reads as "10%" for a percent coupon, or "R$ 10,00" for a fixed-value one — the
 * same ambiguous `value` field means something different depending on `type`. */
export function formatPromotionValue(type: unknown, value: unknown): string {
  const v = Number(value ?? 0);
  return type === "percent" ? `${v}%` : formatBRL(v);
}

export function formatMinSubtotal(minSubtotal: unknown): string {
  return minSubtotal !== undefined && minSubtotal !== null ? formatBRL(Number(minSubtotal)) : "—";
}

export function formatMaxUses(maxUses: unknown): string {
  return maxUses ? String(maxUses) : "Ilimitado";
}

type InfluencerOption = { _id: string; name: string };

/** Resolve o `influencerId` salvo no cupom pro nome de exibição — pura e testável isoladamente,
 * igual `formatPromotionValue`/etc. */
export function formatInfluencerCell(
  influencerId: unknown,
  influencers: InfluencerOption[] | null,
): string {
  if (!influencerId) return "—";
  const match = influencers?.find((i) => i._id === influencerId);
  return match?.name ?? "—";
}

const BASE_COLUMNS: ResourceColumn[] = [
  { key: "_id", label: "ID", editable: false, hiddenOnMobile: true },
  {
    key: "code",
    label: "Código",
    required: true,
    placeholder: "Ex.: BEMVINDO10",
  },
  {
    key: "type",
    label: "Tipo de desconto",
    fieldType: "select",
    required: true,
    defaultValue: "percent",
    selectOptions: [
      { value: "percent", label: "Percentual (%)" },
      { value: "fixed", label: "Valor fixo (R$)" },
    ],
  },
  {
    key: "value",
    label: "Valor",
    fieldType: "number",
    required: true,
    placeholder: "Ex.: 10 (= 10% ou R$10, conforme o tipo)",
  },
  {
    key: "minSubtotal",
    label: "Subtotal mínimo (R$)",
    fieldType: "number",
    placeholder: "Opcional — deixe em branco pra não exigir mínimo",
  },
  {
    key: "maxUses",
    label: "Limite de usos",
    fieldType: "number",
    placeholder: "Opcional — deixe em branco pra uso ilimitado",
  },
  { key: "usedCount", label: "Usos até agora", editable: false },
  { key: "active", label: "Ativo", fieldType: "checkbox", defaultValue: "true" },
];

export function PromotionsClient() {
  // Padrão de select dinâmico já usado em InvoicesClient.tsx: useState<T|null> + useEffect
  // buscando uma vez + columns via useMemo — sem tocar ResourceList (que é genérico, reusado por
  // várias páginas de admin).
  const [influencers, setInfluencers] = useState<InfluencerOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    http
      .get("/influencers", { params: { page: 1, limit: 200 } })
      .then(({ data }) => {
        if (cancelled) return;
        const items = extractListItems(data) as Array<{ _id?: string; name?: string }>;
        setInfluencers(
          items
            .filter((i): i is { _id: string; name: string } => !!i._id && !!i.name)
            .map((i) => ({ _id: i._id, name: i.name })),
        );
      })
      .catch(() => {
        if (!cancelled) setInfluencers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: ResourceColumn[] = useMemo(() => {
    if (influencers === null) return [];
    return [
      ...BASE_COLUMNS,
      {
        key: "influencerId",
        label: "Influenciador",
        fieldType: "select",
        // Gotcha do ResourceList: um select vazio cai em `defaultValue ?? selectOptions[0]?.value`
        // — sem `defaultValue: ""` explícito, deixar em branco salvaria o PRIMEIRO influenciador
        // da lista por engano em vez de "sem influenciador".
        defaultValue: "",
        selectOptions: [
          { value: "", label: "— Nenhum (cupom comum) —" },
          ...influencers.map((i) => ({ value: i._id, label: i.name })),
        ],
      },
    ];
  }, [influencers]);

  if (influencers === null) {
    return (
      <div className="p-4 text-sm" style={{ color: lmfitTokens.textMuted }}>
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Cupons e promoções
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Crie códigos de desconto percentual ou de valor fixo. O cliente aplica o código
          no checkout público; o desconto é sempre validado e calculado pelo servidor no
          momento da compra — nunca confie num valor vindo da tela. Cupom não pode ser
          combinado com preço de atacado. Vincule um influenciador pra ver as vendas dele no
          relatório.
        </p>
      </div>

      <ResourceList
        title="Cupons"
        endpoint="/promotions"
        excel={false}
        columns={columns}
        tableColumns={["code", "type", "value", "influencerId", "usedCount", "maxUses", "active"]}
        cellRender={{
          value: (row) => formatPromotionValue(row.type, row.value),
          minSubtotal: (row) => formatMinSubtotal(row.minSubtotal),
          maxUses: (row) => formatMaxUses(row.maxUses),
          influencerId: (row) => formatInfluencerCell(row.influencerId, influencers),
        }}
      />
    </div>
  );
}
