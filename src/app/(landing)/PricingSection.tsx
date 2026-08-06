"use client";

import { useState } from "react";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  desc: string;
  priceMonthly: number;
  featured?: boolean;
  badge?: string;
  features: PlanFeature[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: "Grátis",
    desc: "Para quem está começando",
    priceMonthly: 0,
    cta: "Começar grátis",
    features: [
      { text: "Catálogo público", included: true },
      { text: "Até 20 produtos", included: true },
      { text: "Pedido via WhatsApp", included: true },
      { text: "Branding personalizado", included: true },
      { text: "1 usuário", included: true },
      { text: "Gestão de clientes", included: false },
      { text: "Kanban de pedidos", included: false },
      { text: "Relatórios", included: false },
    ],
  },
  {
    name: "Básico",
    desc: "Para lojistas em crescimento",
    priceMonthly: 97,
    cta: "Assinar Básico",
    features: [
      { text: "Tudo do Grátis", included: true },
      { text: "Produtos ilimitados", included: true },
      { text: "Gestão de clientes", included: true },
      { text: "Kanban de pedidos", included: true },
      { text: "Fornecedores", included: true },
      { text: "Relatórios básicos", included: true },
      { text: "Export Excel/CSV", included: true },
      { text: "Até 3 usuários", included: true },
    ],
  },
  {
    name: "Pro",
    desc: "Para quem quer escalar",
    priceMonthly: 197,
    featured: true,
    badge: "Mais popular",
    cta: "Assinar Pro",
    features: [
      { text: "Tudo do Básico", included: true },
      { text: "Atacado (preços B2B)", included: true },
      { text: "Produção (custo/lote)", included: true },
      { text: "Chatbot IA WhatsApp", included: true },
      { text: "Checkout (PIX/Stripe/MP)", included: true },
      { text: "Até 10 usuários", included: true },
      { text: "Suporte WhatsApp", included: true },
      { text: "Relatórios avançados", included: false },
    ],
  },
  {
    name: "Enterprise",
    desc: "Operação completa",
    priceMonthly: 497,
    cta: "Falar com consultor",
    features: [
      { text: "Tudo do Pro", included: true },
      { text: "Financeiro (fluxo de caixa)", included: true },
      { text: "Notas fiscais", included: true },
      { text: "Relatórios avançados", included: true },
      { text: "Acesso via API", included: true },
      { text: "Usuários ilimitados", included: true },
      { text: "Suporte dedicado", included: true },
      { text: "Onboarding assistido", included: true },
    ],
  },
];

/** Ilha client isolada: só o toggle mensal/anual precisa de estado — o resto da landing fica no
 *  shell servidor. */
export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="precos" className="kivo-section kivo-section--center">
      <div className="kivo-section-label">💎 Planos</div>
      <h2 className="kivo-section-title">Escolha o plano ideal para você</h2>
      <p className="kivo-section-desc">
        Comece grátis e faça upgrade quando sua loja crescer. Sem multas, sem fidelidade.
      </p>

      <div className="kivo-billing-toggle">
        <span className={`kivo-toggle-label ${!isAnnual ? "active" : ""}`}>Mensal</span>
        <button className={`kivo-toggle-switch ${isAnnual ? "active" : ""}`} onClick={() => setIsAnnual(!isAnnual)}>
          <div className="kivo-toggle-thumb" />
        </button>
        <span className={`kivo-toggle-label ${isAnnual ? "active" : ""}`}>
          Anual <span className="kivo-discount-badge">10% OFF</span>
        </span>
      </div>

      <div className="kivo-pricing-grid">
        {PLANS.map((plan) => {
          const price = isAnnual && plan.priceMonthly > 0 ? Math.floor(plan.priceMonthly * 0.9) : plan.priceMonthly;
          const period = plan.priceMonthly === 0 ? "para sempre" : isAnnual ? "/mês (cobrado anualmente)" : "/mês";

          return (
            <div key={plan.name} className={`kivo-price-card${plan.featured ? " kivo-price-card--featured" : ""}`}>
              {plan.badge && <div className="kivo-price-badge">{plan.badge}</div>}
              <div className="kivo-price-name">{plan.name}</div>
              <div className="kivo-price-desc">{plan.desc}</div>
              <div className="kivo-price-value">
                <span className="kivo-price-currency">R$</span>
                <span className="kivo-price-amount">{price}</span>
              </div>
              <div className="kivo-price-period">{period}</div>
              <ul className="kivo-price-features">
                {plan.features.map((f) => (
                  <li key={f.text}>
                    <span className={`kivo-check ${f.included ? "kivo-check--yes" : "kivo-check--no"}`}>
                      {f.included ? "✓" : "—"}
                    </span>
                    <span style={{ color: f.included ? "var(--kv-text)" : undefined }}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#contato"
                className={`kivo-btn ${plan.featured ? "kivo-btn--primary" : "kivo-btn--ghost"}`}
                style={{ width: "100%" }}
              >
                {plan.cta}
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
