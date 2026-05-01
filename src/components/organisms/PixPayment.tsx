"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/atoms/Badge";
import { PaymentStatusBadge } from "@/components/atoms/PaymentStatusBadge";
import { copyToClipboard, usePixCountdown } from "@/lib/pix";
import { getPublicPaymentStatus } from "@/lib/publicOrders";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { lmfitTokens } from "@/theme/tokens";

export function PixPayment() {
  const { pix, updatePixStatus } = useCheckoutStore();
  const { label: countdownLabel, expired } = usePixCountdown(pix?.expiresAt ?? null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pix || pix.status === "paid" || pix.status === "expired" || pix.status === "failed") return;
    const id = pix.paymentId;
    let cancelled = false;
    const poll = async () => {
      const status = await getPublicPaymentStatus(id);
      if (cancelled || !status) return;
      const s = status.toLowerCase();
      if (s === "paid") updatePixStatus("paid");
      else if (s === "expired") updatePixStatus("expired");
      else if (s === "failed" || s === "cancelled") updatePixStatus("failed");
    };
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pix, updatePixStatus]);

  useEffect(() => {
    if (expired && pix?.status === "pending") updatePixStatus("expired");
  }, [expired, pix, updatePixStatus]);

  if (!pix) return null;

  const onCopy = async () => {
    const ok = await copyToClipboard(pix.qrCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="rounded-lg border bg-white p-4 space-y-3"
      style={{ borderColor: lmfitTokens.border }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          Pague com PIX
        </h3>
        <PaymentStatusBadge
          status={pix.status === "paid" ? "pago" : pix.status === "expired" ? "estornado" : "pendente"}
        />
      </div>

      {pix.qrImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pix.qrImageUrl} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
      ) : (
        <div
          className="w-48 h-48 mx-auto border border-dashed flex items-center justify-center text-xs rounded"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
        >
          QR indisponível — use o código abaixo.
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          PIX copia e cola
        </label>
        <div className="flex items-stretch gap-2">
          <textarea
            readOnly
            value={pix.qrCode}
            className="flex-1 text-xs font-mono border rounded px-2 py-1.5 bg-white"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text, minHeight: 64 }}
          />
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-3 rounded border text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={expired ? "estornado" : "pendente"}>
          {expired ? "Expirou" : `Expira em ${countdownLabel}`}
        </Badge>
        <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Conferimos o pagamento automaticamente.
        </span>
      </div>
    </div>
  );
}
