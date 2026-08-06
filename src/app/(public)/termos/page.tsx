"use client";

import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

export default function TermosPage() {
  const { tenant } = useTenant();
  const storeName = tenant?.name || "esta loja";

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}
      >
        Termos de Uso
      </h1>
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: lmfitTokens.text }}>
        <p>
          Ao navegar e realizar compras em {storeName}, você concorda com os termos descritos
          abaixo. Leia com atenção antes de finalizar um pedido.
        </p>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            1. Pedidos e pagamento
          </h2>
          <p>
            Os preços exibidos incluem os tributos aplicáveis e podem ser alterados sem aviso
            prévio, salvo para pedidos já confirmados. O pedido é considerado confirmado somente
            após a aprovação do pagamento pelo meio escolhido no checkout.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            2. Entrega
          </h2>
          <p>
            Os prazos de entrega informados no checkout são estimativas e podem variar conforme a
            transportadora e a região de destino. O risco pela entrega é transferido ao cliente no
            momento do recebimento no endereço indicado.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            3. Trocas e devoluções
          </h2>
          <p>
            As condições de troca e devolução seguem a política descrita na página de{" "}
            <a href="/devolucoes" className="underline font-medium" style={{ color: lmfitTokens.primary }}>
              Trocas e devoluções
            </a>
            , respeitando o Código de Defesa do Consumidor.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            4. Uso da loja
          </h2>
          <p>
            É vedado o uso deste site para fins ilícitos ou que violem direitos de terceiros. Nos
            reservamos o direito de cancelar pedidos suspeitos de fraude ou de uso indevido de
            cupons promocionais.
          </p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold" style={{ color: lmfitTokens.text }}>
            5. Privacidade
          </h2>
          <p>
            O tratamento de dados pessoais segue nossa{" "}
            <a href="/privacidade" className="underline font-medium" style={{ color: lmfitTokens.primary }}>
              Política de Privacidade
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
