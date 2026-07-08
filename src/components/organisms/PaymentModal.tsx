"use client";

import { useState } from "react";
import { lmfitTokens } from "@/theme/tokens";
import { X, Banknote, CreditCard, QrCode } from "lucide-react";
import { formatBRL } from "@/lib/formatMoney";

export type PaymentMethod = "pix" | "cash" | "card";

export function PaymentModal({
  total,
  onClose,
  onConfirm,
  loading,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, notes: string) => void;
  loading?: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(method, notes);
  };

  const methods = [
    { id: "pix", label: "PIX", icon: QrCode },
    { id: "card", label: "Cartão", icon: CreditCard },
    { id: "cash", label: "Dinheiro", icon: Banknote },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-[var(--card-bg)] w-full max-w-md rounded-xl shadow-xl overflow-hidden border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-semibold text-lg" style={{ color: lmfitTokens.text }}>Finalizar Pagamento</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="text-center space-y-1 py-2">
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>Total a Pagar</p>
            <p className="text-3xl font-bold" style={{ color: lmfitTokens.text }}>
              {formatBRL(total)}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium" style={{ color: lmfitTokens.text }}>
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => {
                const isSelected = method === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                      isSelected ? "border-[var(--primary)] bg-[var(--primary)]/5" : ""
                    }`}
                    style={{ 
                      borderColor: isSelected ? lmfitTokens.primary : lmfitTokens.border,
                      color: isSelected ? lmfitTokens.primary : lmfitTokens.textMuted
                    }}
                  >
                    <Icon size={24} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
              Anotações (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder="Ex: Troco para R$ 100"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md border bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {loading ? "Registrando..." : "Confirmar Venda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
