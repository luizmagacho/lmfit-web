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
  onOrderRequest,
  productionLocked,
}: {
  data: VariantRowData;
  quantity: number;
  focused: boolean;
  onChange: (qty: number) => void;
  onFocus: () => void;
  onOrderRequest?: () => void;
  productionLocked?: boolean;
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
      {outOfStock && quantity === 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (productionLocked) {
              onOrderRequest?.(); // let it fail/alert in PdvClient
            } else {
              onChange(1); // ADD TO CART!
            }
          }}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md text-white transition-opacity hover:opacity-90 whitespace-nowrap ${
            productionLocked ? "bg-gray-400 dark:bg-gray-600" : ""
          }`}
          style={productionLocked ? {} : { backgroundColor: lmfitTokens.primary }}
        >
          {productionLocked && (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          )}
          Encomendar
        </button>
      ) : (
        <NumberStepper
          size="lg"
          min={0}
          max={Math.max(data.stock, 9999)}
          value={quantity}
          onChange={onChange}
          ariaLabel={`Quantidade ${data.sku}`}
        />
      )}
    </li>
  );
}
