"use client";

import { useState } from "react";
import { lmfitTokens } from "@/theme/tokens";
import { X, Calendar } from "lucide-react";
import type { VariantRowData } from "../molecules/VariantQtyRow";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";

type Product = Record<string, unknown>;

export function OrderModal({
  customerName,
  product,
  variant,
  onClose,
  onConfirm,
  loading,
}: {
  customerName: string;
  product: Product;
  variant: VariantRowData;
  onClose: () => void;
  onConfirm: (quantity: number, dueDate?: string) => void;
  loading?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState("");

  const name = String(product.name ?? "Produto");
  const img = resolvePrimaryImageUrl(product);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(quantity, dueDate || undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-[var(--card-bg)] w-full max-w-md rounded-xl shadow-xl overflow-hidden border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-semibold text-lg" style={{ color: lmfitTokens.text }}>Encomendar Item</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-black/5 dark:bg-white/5" style={{ borderColor: lmfitTokens.border }}>
            {img ? (
              <img src={img} alt={name} className="w-12 h-12 object-cover rounded-md" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-md" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: lmfitTokens.text }}>{name}</p>
              <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                {[variant.color, variant.size].filter(Boolean).join(" · ") || "Único"} ({variant.sku})
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm" style={{ color: lmfitTokens.text }}>
              Cliente: <span className="font-medium">{customerName}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
                Quantidade *
              </label>
              <input
                required
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                autoFocus
              />
            </div>
            
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
                <Calendar size={14} /> Data (Opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </div>
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
              disabled={loading || quantity < 1}
              className="px-4 py-2 text-sm font-medium rounded-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {loading ? "Registrando..." : "Criar Encomenda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
