"use client";

import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

const columns: ResourceColumn[] = [
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
          combinado com preço de atacado.
        </p>
      </div>

      <ResourceList
        title="Cupons"
        endpoint="/promotions"
        excel={false}
        columns={columns}
        tableColumns={["code", "type", "value", "usedCount", "maxUses", "active"]}
        cellRender={{
          value: (row) => {
            const v = Number(row.value ?? 0);
            return row.type === "percent" ? `${v}%` : formatBRL(v);
          },
          minSubtotal: (row) =>
            row.minSubtotal !== undefined && row.minSubtotal !== null
              ? formatBRL(Number(row.minSubtotal))
              : "—",
          maxUses: (row) => (row.maxUses ? String(row.maxUses) : "Ilimitado"),
        }}
      />
    </div>
  );
}
