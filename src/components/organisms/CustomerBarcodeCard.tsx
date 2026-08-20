"use client";

import * as React from "react";
import { lmfitTokens } from "@/theme/tokens";
import { Barcode } from "@/components/atoms/Barcode";

/**
 * Loop 34 — carteirinha digital: Code128 do `customerCode`, gerado inteiramente no
 * navegador (sem chamada de rede) a partir do que `/me/profile` já retorna. O leitor
 * do PDV (`BarcodeScannerModal.tsx`) já tem CODE_128 nos formatos aceitos.
 */
export function CustomerBarcodeCard({ customerCode }: { customerCode: string | null }) {
  if (!customerCode) return null;

  return (
    <div className="pt-2 space-y-1.5">
      <p className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
        Carteirinha — mostre no caixa pra identificar seu cadastro
      </p>
      <div className="inline-block rounded-lg border bg-white p-2" style={{ borderColor: lmfitTokens.border }}>
        <Barcode value={customerCode} />
      </div>
      <p className="text-xs font-mono tracking-wide" style={{ color: lmfitTokens.textMuted }}>
        {customerCode}
      </p>
    </div>
  );
}
