"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { globalHttp } from "@/lib/globalHttp";
import "./landing.css";

// Minimalist SVG Icons

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
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
  { num: "3", title: "Compartilhe o link", desc: "Envie suaLoja.kivoni.com.br para suas clientes e comece a vender." },
];

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  desc: string;
  priceMonthly: number;
  period?: string;
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

const MOCK_PRODUCTS = [
  { name: "Conjunto Flow", price: "R$ 70,00", icon: <ClothesIcon1 /> },
  { name: "Jaqueta Dry Fit", price: "R$ 40,00", icon: <ClothesIcon2 /> },
  { name: "Legging Premium", price: "R$ 55,00", icon: <ClothesIcon3 /> },
];

export default function KivoLandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  // Form states for Store Request
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [desiredDomain, setDesiredDomain] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await globalHttp.post("/public/tenants/request", {
        storeName,
        ownerName,
        ownerEmail,
        ownerPhone,
        desiredDomain,
      });
      setFormSuccess(true);
    } catch (err: any) {
      console.error("Erro ao solicitar loja na landing page:", err);
      const msg = err.response?.data?.message;
      setFormError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Erro ao enviar solicitação. Verifique os dados e tente novamente."
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("kivo-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    } else {
      setTheme("light");
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("kivo-theme", nextTheme);
  };

  const logoUrl = "/kivoni-symbol.svg";

  return (
    <div className={`kivo-landing ${!mounted || theme === "light" ? "kivo-light" : ""}`}>
      {/* Background effects */}
      <div className="kivo-grid-bg" />

      {/* Navbar */}
      <nav className="kivo-nav">
        <Link href="/" className="kivo-nav-logo-link">
          <Image
            src="/kivoni-symbol.svg"
            alt="Kivoni Logo"
            width={50}
            height={50}
            className="kivo-nav-logo-img-top"
            priority
          />
        </Link>
        
        <div className="kivo-nav-links-container">
          <div className="kivo-nav-menu">
            <a href="#features">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#precos">Preços</a>
          </div>
          
          <div className="kivo-nav-actions">
            <button
              onClick={toggleTheme}
              className="kivo-theme-toggle"
              aria-label="Alternar tema"
              title={mounted && theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
            >
              {mounted && theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
            
            <Link href="/login" className="kivo-btn kivo-btn--ghost kivo-btn--sm">
              Entrar
            </Link>
            
            <a href="#contato" className="kivo-btn kivo-btn--primary kivo-btn--sm">
              Criar loja
            </a>
          </div>
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
              🔒 suaLoja.kivoni.com.br/catalogo
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

        <div className="kivo-bento-grid">
          {/* Card 1: Catálogo (Large) */}
          <div className="kivo-bento-card kivo-bento-card--large">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">🛍️</div>
              <h3>Catálogo Profissional</h3>
              <p>Seus produtos com fotos, variações de cor e tamanho, preços e estoque sincronizado em tempo real.</p>
            </div>
            <div className="kivo-bento-visual">
              <div className="kivo-bento-mockup-mobile">
                <div style={{ height: "40px", borderBottom: "1px solid var(--kv-border)", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.5rem" }}>
                  <div className="kivo-mockup-circle" style={{ width: "20px", height: "20px" }}></div>
                  <div className="kivo-mockup-line" style={{ width: "60px" }}></div>
                </div>
                <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div style={{ background: "var(--kv-border)", height: "100px", borderRadius: "8px" }}></div>
                  <div style={{ background: "var(--kv-border)", height: "100px", borderRadius: "8px" }}></div>
                  <div style={{ background: "var(--kv-border)", height: "100px", borderRadius: "8px" }}></div>
                  <div style={{ background: "var(--kv-border)", height: "100px", borderRadius: "8px" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: WhatsApp (Medium) */}
          <div className="kivo-bento-card kivo-bento-card--medium">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">💬</div>
              <h3>Pedido via WhatsApp</h3>
              <p>Seu cliente monta o carrinho e envia o pedido formatado direto para o seu número.</p>
            </div>
            <div className="kivo-bento-visual" style={{ minHeight: "150px" }}>
              <div style={{ background: "#25D366", color: "#fff", padding: "0.75rem 1rem", borderRadius: "16px 16px 16px 0", maxWidth: "80%", fontSize: "0.875rem", boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)" }}>
                Novo pedido #1024 📦<br/>Valor: R$ 149,90
              </div>
            </div>
          </div>

          {/* Card 3: Dashboard (Large Reversed) */}
          <div className="kivo-bento-card kivo-bento-card--large-rev">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">📊</div>
              <h3>Dashboard de Gestão</h3>
              <p>Acompanhe suas vendas, faturamento e estoque em gráficos intuitivos e relatórios inteligentes.</p>
            </div>
            <div className="kivo-bento-visual">
              <div className="kivo-bento-mockup-dash">
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1, height: "60px", background: "var(--kv-border)", borderRadius: "8px" }}></div>
                  <div style={{ flex: 1, height: "60px", background: "var(--kv-border)", borderRadius: "8px" }}></div>
                  <div style={{ flex: 1, height: "60px", background: "var(--kv-border)", borderRadius: "8px" }}></div>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", height: "120px", marginTop: "1rem" }}>
                  <div className="kivo-mockup-bar" style={{ flex: 1, height: "40%" }}></div>
                  <div className="kivo-mockup-bar" style={{ flex: 1, height: "70%" }}></div>
                  <div className="kivo-mockup-bar" style={{ flex: 1, height: "100%" }}></div>
                  <div className="kivo-mockup-bar" style={{ flex: 1, height: "85%" }}></div>
                  <div className="kivo-mockup-bar" style={{ flex: 1, height: "60%" }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Checkout (Medium) */}
          <div className="kivo-bento-card kivo-bento-card--medium">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">💳</div>
              <h3>Checkout no App</h3>
              <p>Aceite cartão e PIX de forma segura e rápida sem sair da sua plataforma.</p>
            </div>
          </div>

          {/* Card 5: Kanban (Half) */}
          <div className="kivo-bento-card kivo-bento-card--half">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">📋</div>
              <h3>Kanban de Pedidos</h3>
              <p>Organize o fluxo de separação, envio e entrega dos seus pedidos facilmente.</p>
            </div>
            <div className="kivo-bento-visual" style={{ minHeight: "200px" }}>
               <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
                  <div style={{ flex: 1, background: "var(--kv-border)", borderRadius: "8px", height: "120px", opacity: 0.5 }}></div>
                  <div style={{ flex: 1, background: "var(--kv-border)", borderRadius: "8px", height: "150px", opacity: 0.8 }}></div>
                  <div style={{ flex: 1, background: "var(--kv-gradient)", borderRadius: "8px", height: "90px" }}></div>
               </div>
            </div>
          </div>

          {/* Card 6: IA (Half) */}
          <div className="kivo-bento-card kivo-bento-card--half">
            <div className="kivo-bento-content">
              <div className="kivo-bento-icon">🤖</div>
              <h3>Chatbot IA</h3>
              <p>Atenda seus clientes automaticamente e aumente a conversão, 24 horas por dia.</p>
            </div>
          </div>
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

        <div className="kivo-billing-toggle">
          <span className={`kivo-toggle-label ${!isAnnual ? "active" : ""}`}>Mensal</span>
          <button 
            className={`kivo-toggle-switch ${isAnnual ? "active" : ""}`}
            onClick={() => setIsAnnual(!isAnnual)}
          >
            <div className="kivo-toggle-thumb" />
          </button>
          <span className={`kivo-toggle-label ${isAnnual ? "active" : ""}`}>
            Anual <span className="kivo-discount-badge">10% OFF</span>
          </span>
        </div>

        <div className="kivo-pricing-grid">
          {PLANS.map((plan) => {
            const price = isAnnual && plan.priceMonthly > 0 
              ? Math.floor(plan.priceMonthly * 0.9) 
              : plan.priceMonthly;
            const period = plan.priceMonthly === 0 ? "para sempre" : (isAnnual ? "/mês (cobrado anualmente)" : "/mês");

            return (
              <div
                key={plan.name}
                className={`kivo-price-card${plan.featured ? " kivo-price-card--featured" : ""}`}
              >
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
            );
          })}
        </div>
      </section>

      {/* CTA Banner with Store Request Form */}
      <section id="contato" className="kivo-section" style={{ paddingBottom: 0 }}>
        <div className="kivo-cta" style={{ maxWidth: "800px" }}>
          <h2>Pronta para criar sua loja?</h2>
          <p>
            Preencha os dados abaixo e configure sua loja online em até 24 horas!
          </p>
          
          {formSuccess ? (
            <div className="space-y-4 py-8 text-center" style={{ color: "white" }}>
              <div className="w-16 h-16 bg-white/20 text-white rounded-full flex items-center justify-center mx-auto border border-white/40 mb-4 animate-bounce" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 animate-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">Solicitação Recebida com Sucesso!</h3>
              <p className="text-white/80 max-w-md mx-auto">
                Sua loja online <strong>{storeName}</strong> estará ativa em até <strong>24 horas</strong>.
              </p>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/20 text-sm max-w-sm mx-auto text-left space-y-2 my-6">
                <p>🌐 <strong>Domínio:</strong> {desiredDomain}.kivoni.com.br</p>
                <p>👤 <strong>Responsável:</strong> {ownerName}</p>
                <p>📧 <strong>E-mail:</strong> {ownerEmail}</p>
              </div>
              <p className="text-xs text-white/60 mb-6">
                Enviamos um e-mail de confirmação para {ownerEmail}.
              </p>
              <button
                onClick={() => {
                  setFormSuccess(false);
                  setStoreName("");
                  setOwnerName("");
                  setOwnerEmail("");
                  setOwnerPhone("");
                  setDesiredDomain("");
                }}
                className="kivo-btn"
                style={{ background: "white", color: "#7c3aed", margin: "0 auto" }}
              >
                Solicitar Outra Loja
              </button>
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto">
              {formError && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm font-medium mb-4 text-left">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleRequestSubmit} className="kivo-cta-form">
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="landing-store-name">Nome da Loja / Empresa</label>
                  <input
                    id="landing-store-name"
                    type="text"
                    placeholder="Ex: Minha Confecção"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    disabled={formSubmitting}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="landing-owner-name">Nome do Responsável</label>
                  <input
                    id="landing-owner-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    required
                    disabled={formSubmitting}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="landing-owner-email">E-mail do Responsável</label>
                  <input
                    id="landing-owner-email"
                    type="email"
                    placeholder="voce@dominio.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                    disabled={formSubmitting}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="landing-owner-phone">WhatsApp / Celular</label>
                  <input
                    id="landing-owner-phone"
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    required
                    disabled={formSubmitting}
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label htmlFor="landing-desired-domain">Link desejado (Subdomínio)</label>
                  <div className="domain-input-wrapper">
                    <input
                      id="landing-desired-domain"
                      type="text"
                      placeholder="ex: minha-loja"
                      value={desiredDomain}
                      onChange={(e) => setDesiredDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      required
                      disabled={formSubmitting}
                    />
                    <span>.kivoni.com.br</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="kivo-btn kivo-btn--primary"
                  style={{ background: "white", color: "#7c3aed" }}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Enviando..." : "Solicitar Minha Loja ✨"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="kivo-footer">
        <div className="kivo-footer-logo-container">
          <Image
            src={logoUrl}
            alt="Kivoni Logo"
            width={140}
            height={40}
            className="kivo-footer-logo-img"
            priority
          />
        </div>
        <p>© {new Date().getFullYear()} Kivoni. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
