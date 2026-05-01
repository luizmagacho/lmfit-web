"use client";

import { NumberStepper } from "@/components/atoms/NumberStepper";
import { Badge } from "@/components/atoms/Badge";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

export type VariantRowData = {
  variantId: string;
  sku: string;
  color?: string;
  size?: string;
  unitPrice: number;
  stock: number;
};

export function VariantQtyRow({
  data,
  quantity,
  focused,
  onChange,
  onFocus,
}: {
  data: VariantRowData;
  quantity: number;
  focused: boolean;
  onChange: (qty: number) => void;
  onFocus: () => void;
}) {
  const lowStock = data.stock > 0 && data.stock <= 3;
  const outOfStock = data.stock <= 0;
  return (
    <li
      tabIndex={0}
      onFocus={onFocus}
      onClick={onFocus}
      className={[
        "flex items-center gap-3 px-3 py-2 border-b last:border-0 outline-none",
        focused ? "bg-[color:var(--lmfit-surface,#f6f6f6)]" : "",
      ].join(" ")}
      style={{ borderColor: lmfitTokens.border }}
      data-variant-id={data.variantId}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
            {[data.color, data.size].filter(Boolean).join(" · ") || "Único"}
          </span>
          {outOfStock ? (
            <Badge variant="estornado" size="xs">Sem estoque</Badge>
          ) : lowStock ? (
            <Badge variant="pendente" size="xs">Últimas {data.stock}</Badge>
          ) : (
            <Badge variant="estoque" size="xs">{data.stock} em estoque</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
          <span className="font-mono">{data.sku}</span>
          <span className="tabular-nums">{formatBRL(data.unitPrice)}</span>
        </div>
      </div>
      <NumberStepper
        size="lg"
        min={0}
        max={Math.max(data.stock, 9999)}
        value={quantity}
        onChange={onChange}
        ariaLabel={`Quantidade ${data.sku}`}
      />
    </li>
  );
}
