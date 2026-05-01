"use client";

import Link from "next/link";
import type { StockConflict } from "@/lib/orders/types";
import { lmfitTokens } from "@/theme/tokens";

export function StockConflictPanel({
  title,
  conflicts,
  onAdjustQuantities,
  onDismiss,
}: {
  title: string;
  conflicts?: StockConflict[];
  onAdjustQuantities?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div
      className="rounded-lg border px-3 py-3 space-y-3 text-sm"
      style={{ borderColor: lmfitTokens.error, backgroundColor: "rgba(220, 38, 38, 0.06)" }}
      role="alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium pr-2" style={{ color: lmfitTokens.error }}>
          {title}
        </p>
        {onDismiss ? (
          <button
            type="button"
            className="text-xs min-h-9 px-2 rounded border touch-manipulation"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            onClick={onDismiss}
          >
            Fechar
          </button>
        ) : null}
      </div>
      {conflicts?.length ? (
        <ul className="space-y-2">
          {conflicts.map((c) => (
            <li
              key={c.variantId}
              className="rounded-md border bg-white px-2 py-2"
              style={{ borderColor: lmfitTokens.border }}
            >
              <p className="font-medium tabular-nums" style={{ color: lmfitTokens.text }}>
                {c.sku}{" "}
                <span className="text-xs font-normal" style={{ color: lmfitTokens.textMuted }}>
                  ({c.variantId})
                </span>
              </p>
              <p className="text-xs tabular-nums mt-1" style={{ color: lmfitTokens.textMuted }}>
                Necessário: {c.needed} · Disponível: {c.available}
              </p>
              <p className="mt-1" style={{ color: lmfitTokens.text }}>
                {c.messagePtBr}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        {onAdjustQuantities ? (
          <button
            type="button"
            className="min-h-9 px-3 rounded-md border text-xs font-medium touch-manipulation"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            onClick={onAdjustQuantities}
          >
            Ajustar quantidades
          </button>
        ) : null}
        <Link
          href="/purchases/new"
          className="min-h-9 inline-flex items-center px-3 rounded-md border text-xs font-medium touch-manipulation"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          Ir para compras / novo pedido ao fornecedor
        </Link>
      </div>
    </div>
  );
}
