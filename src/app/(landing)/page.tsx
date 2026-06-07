"use client";

import "./landing.css";

// Minimalist SVG Icons
const LogoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginRight: "8px", verticalAlign: "middle" }}
  >
    <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
    <polyline points="2 12.5 12 19 22 12.5" />
  </svg>
);

const CatalogIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const StockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ChatbotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const CheckoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const ReportsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a78bfa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ClothesIcon1 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M20.38 3.46L16 7.83V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2.83L3.62 3.46a1 1 0 0 0-1.41 0 1 1 0 0 0 0 1.41L7 9.66V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V9.66l4.79-4.79a1 1 0 0 0 0-1.41c-.39-.39-1.02-.39-1.41 0z" />
  </svg>
);

const ClothesIcon2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M4 3h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M12 3v6" />
  </svg>
);

const ClothesIcon3 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const FEATURES = [
  {
    icon: <CatalogIcon />,
    title: "Catálogo Profissional",
    desc: "Seus produtos com fotos, variações de cor e tamanho, preços e estoque. Tudo com a sua marca.",
  },
  {
    icon: <WhatsAppIcon />,
    title: "Pedido via WhatsApp",
    desc: "Suas clientes montam o carrinho no catálogo e enviam o pedido formatado direto no seu WhatsApp.",
  },
  {
    icon: <StockIcon />,
    title: "Controle de Estoque",
    desc: "Gerencie quantidades por variação, receba alertas de estoque baixo e nunca perca uma venda.",
  },
  {
    icon: <ChatbotIcon />,
    title: "Chatbot IA",
    desc: "Atendimento automático 24/7 no WhatsApp. Responde perguntas, organiza pedidos e calcula totais.",
  },
  {
    icon: <CheckoutIcon />,
    title: "Checkout no App",
    desc: "Receba pagamentos direto pela loja com PIX, Stripe e Mercado Pago. Sem redirecionar a cliente.",
  },
  {
    icon: <ReportsIcon />,
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
  { name: "Conjunto Flow", price: "R$ 70,00", icon: <ClothesIcon1 /> },
  { name: "Jaqueta Dry Fit", price: "R$ 40,00", icon: <ClothesIcon2 /> },
  { name: "Legging Premium", price: "R$ 55,00", icon: <ClothesIcon3 /> },
];

export default function KivoLandingPage() {
  return (
    <div className="kivo-landing">
      {/* Background effects */}
      <div className="kivo-grid-bg" />

      {/* Navbar */}
      <nav className="kivo-nav">
        <div className="kivo-nav-logo">
          <LogoIcon />
          Kivo
        </div>
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
                <div className="kivo-mock-product-img">{p.icon}</div>
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
          <a
            href="https://wa.me/5541996770521?text=Oi!%20Quero%20criar%20minha%20loja%20no%20Kivo"
            className="kivo-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="kivo-footer">
        <div className="kivo-footer-logo">
          <LogoIcon />
          Kivo
        </div>
        <p>© {new Date().getFullYear()} Kivo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
