"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

/** Reaproveita `storefront.pages.guiaMedidas` (Loop 4b) — sem campo de config novo. */
export function SizeGuideModal({ onClose }: { onClose: () => void }) {
  const { tenant } = useTenant();
  const text = tenant?.storefront?.pages?.guiaMedidas;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[var(--card-bg)] w-full max-w-md rounded-xl shadow-xl overflow-hidden border"
        style={{ borderColor: lmfitTokens.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-semibold text-lg" style={{ color: lmfitTokens.text }}>
            Guia de medidas
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm leading-relaxed max-h-[60vh] overflow-y-auto" style={{ color: lmfitTokens.text }}>
          {text ? (
            text.split(/\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)
          ) : (
            <p style={{ color: lmfitTokens.textMuted }}>
              {tenant?.name || "Esta loja"} ainda não configurou um guia de medidas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
