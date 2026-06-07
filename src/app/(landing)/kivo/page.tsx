"use client";

import "../landing.css";

const FEATURES = [
  {
    icon: "📦",
    title: "Catálogo Profissional",
    desc: "Seus produtos com fotos, variações de cor e tamanho, preços e estoque. Tudo com a sua marca.",
  },
  {
    icon: "💬",
    title: "Pedido via WhatsApp",
    desc: "Suas clientes montam o carrinho no catálogo e enviam o pedido formatado direto no seu WhatsApp.",
  },
  {
    icon: "📊",
    title: "Controle de Estoque",
    desc: "Gerencie quantidades por variação, receba alertas de estoque baixo e nunca perca uma venda.",
  },
  {
    icon: "🤖",
    title: "Chatbot IA",
    desc: "Atendimento automático 24/7 no WhatsApp. Responde perguntas, organiza pedidos e calcula totais.",
  },
  {
    icon: "💳",
    title: "Checkout no App",
    desc: "Receba pagamentos direto pela loja com PIX, Stripe e Mercado Pago. Sem redirecionar a cliente.",
  },
  {
    icon: "📈",
    title: "Relatórios Inteligentes",
    desc: "Dashboard com vendas do dia, curva ABC de produtos, receita por período e muito mais.",
  },
];

const STEPS = [
  { num: "1", title: "Crie sua loja", desc: "Escolha o nome, suba seu logo e defina as cores da sua marca em minutos." },
  { num: "2", title: "Cadastre seus produtos", desc: "Adicione fotos, variações, preços e estoque. Importe de planilha se quiser." },
  { num: "3", title: "Compartilhe o link", desc: "Envie suaLoja.kivo.app para suas clientes e comece a vender." },
];

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  desc: string;
  price: string;
  period: string;
  featured?: boolean;
  badge?: string;
  features: PlanFeature[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: "Grátis",
    desc: "Para quem está começando",
    price: "0",
    period: "para sempre",
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
    price: "49",
    period: "/mês",
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
    price: "99",
    period: "/mês",
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
    price: "199",
    period: "/mês",
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

const MOCK_PRODUCTS = [
  { name: "Conjunto Flow", price: "R$ 70,00", emoji: "👗" },
  { name: "Jaqueta Dry Fit", price: "R$ 40,00", emoji: "🧥" },
  { name: "Legging Premium", price: "R$ 55,00", emoji: "👖" },
];

export default function KivoLandingPage() {
  return (
    <div className="kivo-landing">
      {/* Background effects */}
      <div className="kivo-grid-bg" />

      {/* Navbar */}
      <nav className="kivo-nav">
        <div className="kivo-nav-logo">◆ Kivo</div>
        <div className="kivo-nav-links">
          <a href="#features">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#precos">Preços</a>
          <a href="#contato" className="kivo-btn kivo-btn--primary kivo-btn--sm">
            Criar minha loja
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="kivo-hero">
        <div className="kivo-glow-orb kivo-glow-orb--purple" />
        <div className="kivo-glow-orb kivo-glow-orb--cyan" />

        <div className="kivo-hero-badge">✨ Plataforma White-Label para Lojistas</div>

        <h1>
          Sua marca.
          <br />
          Seu catálogo.
          <br />
          <span className="kivo-gradient-word">Sem limites.</span>
        </h1>

        <p className="kivo-hero-sub">
          Crie sua loja online profissional em minutos. Catálogo com a sua cara,
          pedidos via WhatsApp, controle de estoque e muito mais — tudo no seu
          subdomínio exclusivo.
        </p>

        <div className="kivo-hero-actions">
          <a href="#contato" className="kivo-btn kivo-btn--primary">
            Criar minha loja grátis
          </a>
          <a href="#features" className="kivo-btn kivo-btn--ghost">
            Ver recursos
          </a>
        </div>

        {/* Browser mockup */}
        <div className="kivo-browser-mockup">
          <div className="kivo-browser-bar">
            <div className="kivo-browser-dot kivo-browser-dot--red" />
            <div className="kivo-browser-dot kivo-browser-dot--yellow" />
            <div className="kivo-browser-dot kivo-browser-dot--green" />
            <div className="kivo-browser-url">
              🔒 suaLoja.kivo.app/catalogo
            </div>
          </div>
          <div className="kivo-browser-content">
            {MOCK_PRODUCTS.map((p) => (
              <div key={p.name} className="kivo-mock-product">
                <div className="kivo-mock-product-img">{p.emoji}</div>
                <div className="kivo-mock-product-info">
                  <div className="kivo-mock-product-name">{p.name}</div>
                  <div className="kivo-mock-product-price">{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="kivo-section kivo-section--center">
        <div className="kivo-section-label">⚡ Recursos</div>
        <h2 className="kivo-section-title">Tudo que você precisa para vender mais</h2>
        <p className="kivo-section-desc">
          Ferramentas profissionais que grandes e-commerces usam — agora
          acessíveis para qualquer lojista.
        </p>
        <div className="kivo-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="kivo-feature-card">
              <div className="kivo-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="kivo-section kivo-section--center">
        <div className="kivo-section-label">🚀 Como funciona</div>
        <h2 className="kivo-section-title">Online em 3 passos</h2>
        <p className="kivo-section-desc">
          Sem código, sem complicação. Sua loja pronta para vender em minutos.
        </p>
        <div className="kivo-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="kivo-step">
              <div className="kivo-step-number">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="kivo-section kivo-section--center">
        <div className="kivo-section-label">💎 Planos</div>
        <h2 className="kivo-section-title">Escolha o plano ideal para você</h2>
        <p className="kivo-section-desc">
          Comece grátis e faça upgrade quando sua loja crescer. Sem multas, sem fidelidade.
        </p>
        <div className="kivo-pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`kivo-price-card${plan.featured ? " kivo-price-card--featured" : ""}`}
            >
              {plan.badge && <div className="kivo-price-badge">{plan.badge}</div>}
              <div className="kivo-price-name">{plan.name}</div>
              <div className="kivo-price-desc">{plan.desc}</div>
              <div className="kivo-price-value">
                <span className="kivo-price-currency">R$</span>
                <span className="kivo-price-amount">{plan.price}</span>
              </div>
              <div className="kivo-price-period">{plan.period}</div>
              <ul className="kivo-price-features">
                {plan.features.map((f) => (
                  <li key={f.text}>
                    <span className={`kivo-check ${f.included ? "kivo-check--yes" : "kivo-check--no"}`}>
                      {f.included ? "✓" : "—"}
                    </span>
                    <span style={{ color: f.included ? "var(--kv-text)" : undefined }}>
                      {f.text}
                    </span>
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
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section id="contato" className="kivo-section" style={{ paddingBottom: 0 }}>
        <div className="kivo-cta">
          <h2>Pronta para criar sua loja?</h2>
          <p>
            Comece agora com o plano grátis. Sem cartão de crédito, sem compromisso.
            Sua loja online em minutos.
          </p>
          <a href="https://wa.me/5541996770521?text=Oi!%20Quero%20criar%20minha%20loja%20no%20Kivo" className="kivo-btn" target="_blank" rel="noopener noreferrer">
            Falar no WhatsApp →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="kivo-footer">
        <div className="kivo-footer-logo">◆ Kivo</div>
        <p>© {new Date().getFullYear()} Kivo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
