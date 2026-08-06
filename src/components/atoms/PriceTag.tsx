import * as React from "react";
import { Badge } from "./Badge";
import { formatBRL } from "@/lib/formatMoney";
import type { PriceMode } from "@/lib/pricing";
import { lmfitTokens } from "@/theme/tokens";

export function PriceTag({
  price,
  priceMax,
  compareAt,
  mode,
}: {
  price: number;
  /** Loop 5 — quando as variações do produto têm preços diferentes, mostra "R$ X – R$ Y" em vez
   *  de um valor único enganoso. */
  priceMax?: number | null;
  compareAt?: number | null;
  mode: PriceMode;
}) {
  const promo = typeof compareAt === "number" && compareAt > price;
  const range = typeof priceMax === "number" && priceMax > price;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
          {range ? `${formatBRL(price)} – ${formatBRL(priceMax)}` : formatBRL(price)}
        </span>
        {!range && promo ? (
          <span className="text-xs line-through tabular-nums" style={{ color: lmfitTokens.textMuted }}>
            {formatBRL(compareAt)}
          </span>
        ) : null}
      </div>
      <div>
        <Badge variant={mode === "atacado" ? "atacado" : "varejo"} size="xs">
          {mode === "atacado" ? "Atacado" : "Varejo"}
        </Badge>
      </div>
    </div>
  );
}
