"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { QuickCart } from "@/components/organisms/QuickCart";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

export function CatalogFloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const lines = useCartStore((s) => s.lines);
  
  const items = lines.reduce((acc, l) => acc + l.quantity, 0);
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);

  if (items === 0) return null;

  const handleCheckout = () => {
    // Numero oficial da LM Fit
    const storePhone = "5541996770521"; 

    let text = "Olá! Gostaria de finalizar meu pedido com os itens do catálogo:\n\n";
    lines.forEach((l) => {
      text += `🛍️ *${l.quantity}x ${l.productName}*\n`;
      text += `   ↳ SKU: ${l.sku}\n`;
      if (l.color || l.size) {
        text += `   ↳ Variação: ${[l.color, l.size].filter(Boolean).join(" / ")}\n`;
      }
      text += `   ↳ Preço unit.: ${formatBRL(l.unitPrice)}\n\n`;
    });
    text += `💰 *Subtotal: ${formatBRL(subtotal)}*\n\n`;
    text += "Aguardo retorno para finalizar o pagamento e combinar a entrega/retirada!";

    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${storePhone}?text=${encodedText}`;
    window.open(url, "_blank");
  };

  return (
    <>
      {/* Backdrop (quando aberto) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Cart Drawer */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 transform ${isOpen ? "translate-y-0" : "translate-y-[100%]"}`}
      >
        <div className="w-full flex justify-center py-3" onClick={() => setIsOpen(false)}>
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
        </div>
        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>Sua Sacola</h2>
        </div>
        <div className="pb-6">
          <QuickCart 
            onFinalize={handleCheckout} 
            finalizeLabel="Comprar via WhatsApp" 
          />
        </div>
      </div>

      {/* Floating Button (quando fechado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-80 h-14 rounded-full shadow-lg flex items-center justify-between px-6 transition-transform active:scale-95 z-40"
          style={{ backgroundColor: lmfitTokens.primary, color: "white" }}
        >
          <div className="flex items-center gap-2 font-medium">
            <div className="relative">
              <ShoppingBag size={20} />
              <span className="absolute -top-1.5 -right-2 bg-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full" style={{ color: lmfitTokens.primary }}>
                {items}
              </span>
            </div>
            <span>Ver Sacola</span>
          </div>
          <span className="font-semibold">{formatBRL(subtotal)}</span>
        </button>
      )}
    </>
  );
}
