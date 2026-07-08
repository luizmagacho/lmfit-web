"use client";

import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { QuickCart } from "@/components/organisms/QuickCart";
import { formatBRL } from "@/lib/formatMoney";
import { publicHttp } from "@/lib/publicHttp";
import { lmfitTokens } from "@/theme/tokens";

export function CatalogFloatingCart() {
  const [isOpen, setIsOpen] = useState(false);
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    
    let formatted = v;
    if (v.length > 10) {
      formatted = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 6) {
      formatted = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    } else if (v.length > 2) {
      formatted = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      formatted = `(${v}`;
    }
    setCustomerPhone(formatted);
  };

  const items = lines.reduce((acc, l) => acc + l.quantity, 0);
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);

  if (items === 0) return null;

  const handleCheckout = async () => {
    if (!showForm) {
      setIsOpen(true);
      setShowForm(true);
      return;
    }
    
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Por favor, preencha nome e telefone para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar Rascunho
      const res1 = await publicHttp.post("/public/order-drafts", {});
      const token = res1.data.sessionToken;

      // 2. Adicionar itens e cliente
      await publicHttp.patch(`/public/order-drafts/${token}`, {
        lines: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })),
        metadata: {
          customer: { name: customerName, phone: customerPhone }
        }
      });

      // 3. Submeter pedido
      const res3 = await publicHttp.post(`/public/order-drafts/${token}/submit`, {});
      const orderId = res3.data.orderId;

      // 4. Montar mensagem WhatsApp
      const storePhone = "5541996770521"; 
      let text = `Olá! Gostaria de finalizar meu pedido #${orderId} com os itens:\n\n`;
      lines.forEach((l) => {
        text += `🛍️ *${l.quantity}x ${l.productName}*\n`;
        if (l.color || l.size) {
          text += `   • Variação: ${[l.color, l.size].filter(Boolean).join(" / ")}\n`;
        }
        text += `   • Preço unit.: ${formatBRL(l.unitPrice)}\n\n`;
      });
      text += `💰 *Subtotal: ${formatBRL(subtotal)}*\n\n`;
      text += `Nome: ${customerName}\nTelefone: ${customerPhone}\n\n`;
      text += "Aguardo retorno para finalizar o pagamento e combinar a entrega/retirada!";

      const encodedText = encodeURIComponent(text);
      const url = `https://wa.me/${storePhone}?text=${encodedText}`;
      
      clearCart();
      setIsOpen(false);
      setShowForm(false);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao gerar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="px-4 pb-2 flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>Sua Sacola</h2>
          {showForm && (
            <button onClick={() => setShowForm(false)} className="text-sm font-medium" style={{ color: lmfitTokens.primary }}>
              Voltar
            </button>
          )}
        </div>
        
        {showForm && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-sm font-medium" style={{ color: lmfitTokens.textMuted }}>Preencha seus dados para criar o pedido:</p>
            <input 
              type="text" 
              placeholder="Seu Nome Completo" 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ borderColor: lmfitTokens.border }}
              disabled={isSubmitting}
            />
            <input 
              type="tel" 
              placeholder="Seu WhatsApp (DDD + Número)" 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={customerPhone}
              onChange={handlePhoneChange}
              style={{ borderColor: lmfitTokens.border }}
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="pb-6">
          <QuickCart 
            onFinalize={handleCheckout} 
            finalizeLabel={showForm ? "Confirmar e Enviar" : "Comprar via WhatsApp"} 
            busy={isSubmitting}
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
