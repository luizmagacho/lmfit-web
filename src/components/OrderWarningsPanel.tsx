"use client";

import Link from "next/link";
import type { OrderWarning } from "@/lib/orders/types";
import { lmfitTokens } from "@/theme/tokens";

export function OrderWarningsPanel({ warnings }: { warnings: OrderWarning[] }) {
  if (!warnings.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-3 space-y-2 text-sm"
      style={{ borderColor: lmfitTokens.border, backgroundColor: lmfitTokens.warningBg }}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium" style={{ color: lmfitTokens.text }}>
        Avisos do pedido
      </p>
      <ul className="space-y-2">
        {warnings.map((w, i) => (
          <li
            key={`${w.variantId}-${w.type}-${i}`}
            className="rounded-md border px-2 py-2 bg-[var(--card-bg)]/80"
            style={{ borderColor: lmfitTokens.border }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <span
                  className="inline-block text-xs font-medium uppercase tracking-wide"
                  style={{ color: lmfitTokens.accentBlue }}
                >
                  {w.type === "shortfall" ? "Falta de estoque" : "Compra pendente"}
                </span>
                <p style={{ color: lmfitTokens.text }}>{w.messagePtBr}</p>
                {w.type === "shortfall" && w.shortfall != null ? (
                  <p className="text-xs tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                    Déficit: {w.shortfall}
                  </p>
                ) : null}
                {w.type === "pending_purchase" && w.pendingPurchaseQty != null ? (
                  <p className="text-xs tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                    Qtd pendente na compra: {w.pendingPurchaseQty}
                  </p>
                ) : null}
              </div>
              {w.suggestCreatePurchase ? (
                <Link
                  href={`/purchases/new?variantId=${encodeURIComponent(w.variantId)}`}
                  className="shrink-0 min-h-9 inline-flex items-center rounded-md px-3 text-xs font-medium text-white touch-manipulation"
                  style={{ backgroundColor: lmfitTokens.primary }}
                >
                  Registrar compra
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
