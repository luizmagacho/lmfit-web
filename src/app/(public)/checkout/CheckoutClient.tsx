"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddressForm } from "@/components/organisms/AddressForm";
import { ShippingPicker, shippingCost } from "@/components/organisms/ShippingPicker";
import { PixPayment } from "@/components/organisms/PixPayment";
import { PaymentStatusBadge } from "@/components/atoms/PaymentStatusBadge";
import { Badge } from "@/components/atoms/Badge";
import { formatBRL } from "@/lib/formatMoney";
import { createPublicDraftWithLines, submitPublicDraft } from "@/lib/publicOrders";
import { useCartStore } from "@/stores/useCartStore";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { lmfitTokens } from "@/theme/tokens";
import { useTenant } from "@/context/TenantContext";

export function CheckoutClient() {
  const router = useRouter();
  const cart = useCartStore();
  const snap = cart.snapshot();
  const checkout = useCheckoutStore();
  const { tenant } = useTenant();

  const [addressValid, setAddressValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"infinitepay" | "manual">("infinitepay");

  useEffect(() => {
    if (tenant && !tenant.infinitePayTag) {
      setPaymentMethod("manual");
    }
  }, [tenant]);

  const shippingValue = shippingCost(checkout.shipping);
  const total = snap.subtotal + shippingValue;

  const canSubmit = useMemo(() => {
    if (snap.items === 0) return false;
    if (!checkout.customerName.trim() || !checkout.customerPhone.trim()) return false;
    if (checkout.shipping !== "pickup" && !addressValid) return false;
    return true;
  }, [snap.items, checkout, addressValid]);

  async function submit() {
    setErr(null);
    setSubmitting(true);
    try {
      const { sessionToken } = await createPublicDraftWithLines({
        customer: {
          name: checkout.customerName,
          phone: checkout.customerPhone,
          email: checkout.customerEmail || null,
        },
        shipping: {
          method: checkout.shipping,
          address: checkout.shipping === "pickup" ? null : checkout.address,
        },
        lines: snap.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      });

      if (paymentMethod === "infinitepay") {
        const result = await submitPublicDraft(sessionToken, { payment: { method: "infinitepay" } });
        const payment = result.payment;
        const paymentId = payment?.paymentId ?? payment?.id ?? "";
        const checkoutUrl = payment?.checkoutUrl;
        cart.clear();
        if (checkoutUrl && checkoutUrl.startsWith("http")) {
          if (typeof window !== "undefined") {
            window.location.href = checkoutUrl;
          }
        } else {
          router.push(`/checkout/payment-simulation?paymentId=${paymentId}&token=${encodeURIComponent(sessionToken)}`);
        }
      } else {
        const result = await submitPublicDraft(sessionToken, { payment: { method: "manual" } });
        const orderId = result.orderId;
        const msg = `Olá! Gostaria de confirmar meu pedido #${orderId} no valor de ${formatBRL(total)}.\n\nItens:\n${snap.lines.map((l) => `- ${l.productName} (${[l.color, l.size].filter(Boolean).join(" · ")}) x${l.quantity}`).join("\n")}`;
        
        const cleanPhone = (tenant?.whatsappNumber || "").replace(/\D/g, "");
        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
        
        if (typeof window !== "undefined") {
          window.open(waUrl, "_blank");
        }
        cart.clear();
        router.push(`/pedido/novo?session=${encodeURIComponent(sessionToken)}`);
      }
    } catch (e: any) {
      console.error(e);
      setErr("Não foi possível criar o pedido. Verifique os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
          Finalizar pedido
        </h1>
      </header>

      {snap.items === 0 ? (
        <div
          className="rounded-lg border bg-[var(--card-bg)] p-6 text-center text-sm"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
        >
          Seu carrinho está vazio. Adicione produtos no{" "}
          <a href="/catalogo" className="underline" style={{ color: lmfitTokens.primary }}>
            catálogo
          </a>
          .
        </div>
      ) : null}

      {snap.items > 0 ? (
        <>
          <section
            className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3"
            style={{ borderColor: lmfitTokens.border }}
          >
            <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
              Seus dados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                Nome
                <input
                  type="text"
                  autoComplete="name"
                  className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  value={checkout.customerName}
                  onChange={(e) => checkout.setCustomer({ customerName: e.target.value })}
                />
              </label>
              <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                Telefone
                <input
                  type="tel"
                  autoComplete="tel"
                  className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  value={checkout.customerPhone}
                  onChange={(e) => checkout.setCustomer({ customerPhone: e.target.value })}
                />
              </label>
              <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                E-mail (opcional)
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  value={checkout.customerEmail}
                  onChange={(e) => checkout.setCustomer({ customerEmail: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section
            className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3"
            style={{ borderColor: lmfitTokens.border }}
          >
            <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
              Entrega
            </h2>
            <ShippingPicker />
            {checkout.shipping !== "pickup" ? (
              <AddressForm onValid={setAddressValid} />
            ) : null}
          </section>

          {tenant?.infinitePayTag ? (
            <section
              className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3"
              style={{ borderColor: lmfitTokens.border }}
            >
              <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
                Forma de Pagamento
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("infinitepay")}
                  className="flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer select-none gap-1 focus:outline-none"
                  style={{
                    borderColor: paymentMethod === "infinitepay" ? lmfitTokens.primary : lmfitTokens.border,
                    backgroundColor: paymentMethod === "infinitepay" ? `color-mix(in srgb, ${lmfitTokens.primary} 5%, var(--card-bg))` : "transparent",
                  }}
                >
                  <span className="font-semibold text-sm" style={{ color: lmfitTokens.text }}>
                    Cartão de Crédito / Pix (Online)
                  </span>
                  <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                    Pague de forma segura online via InfinitePay.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("manual")}
                  className="flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer select-none gap-1 focus:outline-none"
                  style={{
                    borderColor: paymentMethod === "manual" ? lmfitTokens.primary : lmfitTokens.border,
                    backgroundColor: paymentMethod === "manual" ? `color-mix(in srgb, ${lmfitTokens.primary} 5%, var(--card-bg))` : "transparent",
                  }}
                >
                  <span className="font-semibold text-sm" style={{ color: lmfitTokens.text }}>
                    Combinar no WhatsApp (Manual)
                  </span>
                  <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                    Envie o pedido para finalizar o pagamento direto com a loja.
                  </span>
                </button>
              </div>
            </section>
          ) : null}

          <section
            className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3"
            style={{ borderColor: lmfitTokens.border }}
          >
            <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
              Revisão
            </h2>
            <ul className="divide-y" style={{ borderColor: lmfitTokens.border }}>
              {snap.lines.map((l) => (
                <li key={l.variantId} className="py-2 flex items-center gap-2">
                  <span className="flex-1 text-sm" style={{ color: lmfitTokens.text }}>
                    {l.productName}
                    <span className="text-xs ml-1" style={{ color: lmfitTokens.textMuted }}>
                      {[l.color, l.size].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <Badge variant={l.mode === "atacado" ? "atacado" : "varejo"} size="xs">
                    {l.mode === "atacado" ? "Atacado" : "Varejo"}
                  </Badge>
                  <span className="tabular-nums text-sm" style={{ color: lmfitTokens.text }}>
                    {l.quantity}× {formatBRL(l.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 text-sm" style={{ color: lmfitTokens.text }}>
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatBRL(snap.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Frete</dt>
                <dd className="tabular-nums">{shippingValue === 0 ? "Grátis" : formatBRL(shippingValue)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t" style={{ borderColor: lmfitTokens.border }}>
                <dt>Total</dt>
                <dd className="tabular-nums">{formatBRL(total)}</dd>
              </div>
            </dl>
            {err ? (
              <p className="text-sm" style={{ color: lmfitTokens.error }}>{err}</p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="w-full min-h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 active:scale-[0.99] transition-all shadow-sm"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {submitting ? "Processando..." : paymentMethod === "infinitepay" ? "Finalizar e Pagar Online" : "Finalizar e abrir WhatsApp"}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
