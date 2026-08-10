"use client";

import * as React from "react";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useCartStore } from "@/stores/useCartStore";
import { QuickCart } from "@/components/organisms/QuickCart";
import { formatBRL } from "@/lib/formatMoney";
import { publicHttp } from "@/lib/publicHttp";
import { lmfitTokens } from "@/theme/tokens";
import { useTenant } from "@/context/TenantContext";

export function CatalogFloatingCart() {
  const { tenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Preenchido quando o pedido é criado com sucesso — mostra um link de verdade pro WhatsApp
  // em vez de só torcer pro window.open() automático funcionar (ver comentário em
  // handleCheckout: no Safari do iPhone ele segue falhando mesmo pré-aberto de forma síncrona,
  // provavelmente a aba em branco é fechada silenciosamente enquanto as 3 chamadas de rede
  // rodam). Um toque real num <a href> nunca é bloqueado por popup blocker nenhum.
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

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

  // clearCart() on a successful submit zeroes `items` on the next render — without the
  // whatsappUrl check this would unmount the component (and the confirmation link with it)
  // the instant the order succeeds, before the customer ever sees it.
  if (items === 0 && !whatsappUrl) return null;

  const handleCheckout = async () => {
    if (!showForm) {
      setIsOpen(true);
      setShowForm(true);
      return;
    }
    
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Por favor, preencha nome e telefone para continuar.");
      return;
    }

    // Checado ANTES de criar o pedido de verdade — sem isso, uma loja sem WhatsApp configurado
    // (Configurações) ainda submetia o pedido no servidor e só então descobria que não tinha
    // pra onde mandar a mensagem, deixando um pedido "órfão" sem confirmação nenhuma pro cliente.
    const storePhone = (tenant?.whatsappNumber || "").replace(/\D/g, "");
    if (!storePhone) {
      toast.error("A loja ainda não configurou um número de WhatsApp para receber pedidos.");
      return;
    }

    // Abre a aba em branco JÁ, ainda de forma síncrona dentro do clique — o Safari do iOS
    // bloqueia window.open() se ele acontecer depois de qualquer await (mesmo vindo de um
    // clique real), então esperar as 3 chamadas de rede abaixo pra só então abrir sempre
    // falhava silenciosamente no iPhone. Navegamos essa aba já aberta quando a URL fica pronta.
    const whatsappWindow = window.open("", "_blank");

    setIsSubmitting(true);
    try {
      // 1. Criar Rascunho
      const res1 = await publicHttp.post("/public/order-drafts", {});
      const token = res1.data.sessionToken;

      // 2. Adicionar itens, cliente e cupom (desconto sempre recalculado no servidor)
      const res2 = await publicHttp.patch(`/public/order-drafts/${token}`, {
        lines: lines.map(l => ({ variantId: l.variantId, quantity: l.quantity })),
        metadata: {
          customer: { name: customerName, phone: customerPhone }
        },
        couponCode: couponCode.trim() || undefined,
      });
      const discountTotal = Number(res2.data?.discountTotal ?? 0);
      const total = subtotal - discountTotal;

      // 3. Submeter pedido
      const res3 = await publicHttp.post(`/public/order-drafts/${token}/submit`, {});
      const orderId = res3.data.orderId;

      // 4. Montar mensagem WhatsApp (storePhone já validado antes de abrir o pedido, acima)
      let text = `Olá! Gostaria de finalizar meu pedido #${orderId} com os itens:\n\n`;
      lines.forEach((l) => {
        text += `🛍️ *${l.quantity}x ${l.productName}*\n`;
        if (l.color || l.size) {
          text += `   • Variação: ${[l.color, l.size].filter(Boolean).join(" / ")}\n`;
        }
        text += `   • Preço unit.: ${formatBRL(l.unitPrice)}\n\n`;
      });
      text += `💰 *Subtotal: ${formatBRL(subtotal)}*\n`;
      if (discountTotal > 0) {
        text += `🏷️ *Cupom ${couponCode.trim().toUpperCase()}: -${formatBRL(discountTotal)}*\n`;
        text += `💵 *Total: ${formatBRL(total)}*\n`;
      }
      text += `\nNome: ${customerName}\nTelefone: ${customerPhone}\n\n`;
      text += "Aguardo retorno para finalizar o pagamento e combinar a entrega/retirada!";

      const encodedText = encodeURIComponent(text);
      const url = `https://wa.me/${storePhone}?text=${encodedText}`;

      clearCart();
      setShowForm(false);
      setCouponCode("");
      // Melhor esforço: funciona em vários navegadores. Mas não confiamos só nisso — o botão
      // com <a href> abaixo (setWhatsappUrl) é o caminho garantido, inclusive no iPhone.
      if (whatsappWindow) {
        whatsappWindow.location.href = url;
      }
      setWhatsappUrl(url);
    } catch (e: any) {
      whatsappWindow?.close();
      console.error(e);
      toast.error(e?.response?.data?.message || "Ocorreu um erro ao gerar o pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fecha o drawer e, se o pedido já tinha sido enviado, também limpa o estado de confirmação —
  // sem isso, fechar sem tocar em "Abrir WhatsApp" deixava o carrinho flutuante reaparecer
  // vazio (0 itens / R$0,00) porque `items === 0 && !whatsappUrl` deixava de ser verdade.
  const handleClose = () => {
    setIsOpen(false);
    setWhatsappUrl(null);
  };

  return (
    <>
      {/* Backdrop (quando aberto) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Cart Drawer */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)] rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 transform ${isOpen ? "translate-y-0" : "translate-y-[100%]"}`}
      >
        <div className="w-full flex justify-center py-3" onClick={handleClose}>
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
        
        {whatsappUrl ? (
          <div className="px-4 pb-6 space-y-4 text-center">
            <p className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
              Pedido enviado! Toque no botão abaixo para continuar no WhatsApp.
            </p>
            {/* Um toque real neste link nunca é bloqueado por popup blocker — diferente de um
             *  window.open() disparado depois de chamadas assíncronas, que o Safari do iPhone
             *  segue recusando mesmo com a aba pré-aberta de forma síncrona. */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setIsOpen(false);
                setWhatsappUrl(null);
              }}
              className="flex items-center justify-center w-full min-h-12 rounded-md text-white font-semibold"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              Abrir WhatsApp
            </a>
          </div>
        ) : (
          <>
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
                <input
                  type="text"
                  placeholder="Cupom de desconto (opcional)"
                  className="w-full border rounded-md px-3 py-2 text-sm uppercase placeholder:normal-case"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
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
          </>
        )}
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
