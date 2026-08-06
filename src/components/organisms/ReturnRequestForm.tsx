"use client";

import * as React from "react";
import { useState } from "react";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

export type ReturnableLine = {
  variantId: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  returnedQty: number;
};

export type ReturnRequestPayload = {
  type: "return" | "exchange";
  lines: Array<{ variantId: string; quantity: number; reason?: string }>;
  notes?: string;
};

export function clampQty(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export function ReturnRequestForm({
  lines,
  onSubmit,
}: {
  lines: ReturnableLine[];
  onSubmit: (payload: ReturnRequestPayload) => Promise<void>;
}) {
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});
  const [type, setType] = useState<"return" | "exchange">("return");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [done, setDone] = useState(false);

  function setQty(variantId: string, value: number, max: number) {
    setQtyByVariant((prev) => ({ ...prev, [variantId]: clampQty(value, max) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const selected = Object.entries(qtyByVariant)
      .filter(([, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity, reason: reason || undefined }));
    if (!selected.length) {
      setMessage({ type: "error", text: "Selecione a quantidade de ao menos um item." });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ type, lines: selected, notes: notes || undefined });
      setDone(true);
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Não foi possível enviar sua solicitação." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm" style={{ color: lmfitTokens.success }}>
        Solicitação enviada! Você receberá um e-mail assim que ela for avaliada.
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        Nenhum item deste pedido está disponível para troca ou devolução no momento.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {lines.map((l) => {
          const available = l.quantity - l.returnedQty;
          const qty = qtyByVariant[l.variantId] ?? 0;
          return (
            <div
              key={l.variantId}
              className="flex items-center justify-between gap-3 text-sm border-b pb-2"
              style={{ borderColor: lmfitTokens.border }}
            >
              <div className="min-w-0">
                <p className="truncate" style={{ color: lmfitTokens.text }}>
                  {l.description || l.variantId}
                </p>
                <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                  {formatBRL(l.unitPrice)} · disponível: {available}
                </p>
              </div>
              <input
                type="number"
                min={0}
                max={available}
                value={qty}
                onChange={(e) => setQty(l.variantId, Math.floor(Number(e.target.value) || 0), available)}
                className="w-16 min-h-9 border rounded px-2 py-1 text-sm bg-[var(--card-bg)] text-right"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          O que você prefere?
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "return" | "exchange")}
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="return">Vale-compras (crédito de loja)</option>
            <option value="exchange">Troca (tamanho/cor)</option>
          </select>
        </label>
        <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Motivo
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: tamanho pequeno, defeito…"
            className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </label>
      </div>

      <label className="text-xs block" style={{ color: lmfitTokens.textMuted }}>
        {type === "exchange" ? "Tamanho/cor desejado e observações" : "Observações"}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        {message ? (
          <p className="text-xs" style={{ color: lmfitTokens.error }}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          {submitting ? "Enviando…" : "Enviar solicitação"}
        </button>
      </div>
    </form>
  );
}
