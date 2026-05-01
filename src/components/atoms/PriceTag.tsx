import { Badge } from "./Badge";
import { formatBRL } from "@/lib/formatMoney";
import type { PriceMode } from "@/lib/pricing";
import { lmfitTokens } from "@/theme/tokens";

export function PriceTag({
  price,
  compareAt,
  mode,
}: {
  price: number;
  compareAt?: number | null;
  mode: PriceMode;
}) {
  const promo = typeof compareAt === "number" && compareAt > price;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
          {formatBRL(price)}
        </span>
        {promo ? (
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
