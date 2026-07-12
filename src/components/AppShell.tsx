"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTenantStore } from "@/stores/useTenantStore";
import { RequireAuth } from "@/components/RequireAuth";
import { lmfitTokens } from "@/theme/tokens";
import { useLanguage } from "@/context/LanguageContext";
import { useTenant } from "@/context/TenantContext";

import { 
  LayoutDashboard, 
  Smartphone, 
  Layers, 
  Users, 
  Filter, 
  CheckSquare, 
  UserCheck, 
  Truck, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  Wallet, 
  BarChart, 
  MessageSquare, 
  User, 
  Settings,
  Scissors,
  Star,
  Store,
  Warehouse,
  Receipt,
  Tag,
  Undo2
} from "lucide-react";

const navKeys = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/pdv", key: "nav.pdv", icon: Smartphone },
  { href: "/inventory", key: "nav.inventory", icon: Layers },
  { href: "/locations", key: "nav.locations", icon: Warehouse },
  { href: "/customers", key: "nav.customers", icon: Users },
  // { href: "/crm/pipeline", key: "nav.pipeline", icon: Filter },
  // { href: "/crm/tasks", key: "nav.tasks", icon: CheckSquare },
  // { href: "/crm/segments", key: "nav.segments", icon: UserCheck },
  { href: "/suppliers", key: "nav.suppliers", icon: Truck },
  { href: "/products", key: "nav.products", icon: Package },
  { href: "/materials", key: "nav.materials", icon: Layers },
  { href: "/orders", key: "nav.orders", icon: ShoppingCart },
  { href: "/returns", key: "nav.returns", icon: Undo2 },
  { href: "/promotions", key: "nav.promotions", icon: Tag },
  { href: "/purchases", key: "nav.purchases", icon: CreditCard },
  { href: "/production", key: "nav.production", icon: Scissors },
  { href: "/invoices", key: "nav.invoices", icon: FileText },
  { href: "/fiscal", key: "nav.fiscal", icon: Receipt },
  { href: "/financial", key: "nav.financial", icon: Wallet },
  { href: "/reports", key: "nav.reports", icon: BarChart },
  { href: "/escalations", key: "nav.escalations", icon: MessageSquare },
  { href: "/users", key: "nav.users", icon: User },
  { href: "/billing", key: "nav.billing", icon: Star },
  { href: "/integrations", key: "nav.integrations", icon: Store },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

const tourStepsInfo: Record<string, { title: string; desc: string }> = {
  "nav.dashboard": {
    title: "Painel Principal (Dashboard)",
    desc: "Visualize gráficos de vendas, faturamento e as métricas comerciais mais importantes em tempo real."
  },
  "nav.pdv": {
    title: "PDV (Ponto de Venda)",
    desc: "Interface de caixa rápida otimizada para realizar vendas de forma ágil no balcão, celular ou tablet."
  },
  "nav.inventory": {
    title: "Controle de Estoque",
    desc: "Edição rápida em lote de preços, custos e quantidade dos produtos em estoque."
  },
  "nav.locations": {
    title: "Estoque Multi-local",
    desc: "Cadastre depósitos e lojas físicas e transfira estoque entre eles, com o saldo separado por local."
  },
  "nav.customers": {
    title: "Clientes",
    desc: "Ficha cadastral completa de clientes, histórico de compras, fiado e cálculo do LTV (Lifetime Value)."
  },
  "nav.suppliers": {
    title: "Fornecedores",
    desc: "Gerenciamento de contatos de oficinas de corte, costura, facções e fornecedores de insumos."
  },
  "nav.products": {
    title: "Produtos (Grade e SKU)",
    desc: "Grade de cor x tamanho com gerador dinâmico de SKUs inteligentes em tempo real."
  },
  "nav.materials": {
    title: "Materiais (Insumos)",
    desc: "Cadastro e controle de malhas, tecidos, linhas e aviamentos utilizados na sua confecção."
  },
  "nav.orders": {
    title: "Pedidos de Venda",
    desc: "Acompanhe e controle o status das vendas da separação até a expedição e entrega."
  },
  "nav.returns": {
    title: "Devoluções e Trocas",
    desc: "Registre devoluções e trocas de pedidos enviados/concluídos, com estorno automático de estoque e crédito de loja."
  },
  "nav.promotions": {
    title: "Cupons e Promoções",
    desc: "Crie cupons de desconto (percentual ou valor fixo) aplicáveis no checkout público e no PDV."
  },
  "nav.purchases": {
    title: "Compras de Insumos",
    desc: "Registre notas de compra de matéria-prima para alimentar o estoque de materiais e gerar custos."
  },
  "nav.production": {
    title: "Ordens de Produção",
    desc: "Controle as etapas de corte, costura e acabamento. Calcule o custo real de fabricação de cada peça."
  },
  "nav.invoices": {
    title: "Contas a Receber",
    desc: "Acompanhe títulos, vencimentos e status de pagamento das suas vendas a prazo."
  },
  "nav.fiscal": {
    title: "Módulo Fiscal",
    desc: "Configure CNPJ e credenciais Nuvem Fiscal, emita NF-e/NFC-e por pedido e acompanhe o histórico de notas."
  },
  "nav.financial": {
    title: "Financeiro & DRE",
    desc: "Fluxo de caixa diário, DRE estruturado e importador automático de relatórios InfinitePay."
  },
  "nav.reports": {
    title: "Relatórios & Curva ABC",
    desc: "Análises gerenciais profundas de rentabilidade, faturamento e giro de estoque por curva ABC."
  },
  "nav.escalations": {
    title: "Alertas & WhatsApp",
    desc: "Envio automatizado de mensagens de cobrança, códigos Pix e status de rastreamento de pedidos."
  },
  "nav.users": {
    title: "Usuários & Permissões",
    desc: "Gerencie os membros da sua equipe e defina o nível de acesso e permissões de cada um."
  },
  "nav.billing": {
    title: "Meu Plano (Stripe)",
    desc: "Gerencie sua assinatura, consulte limites vigentes e altere a forma de pagamento pelo portal Stripe."
  },
  "nav.integrations": {
    title: "Integrações e E-commerce",
    desc: "Conecte sua loja virtual (Bagy, Nuvemshop, etc.) para sincronizar estoque e produtos automaticamente."
  },
  "nav.settings": {
    title: "Configurações Gerais",
    desc: "Ajuste os dados cadastrais da loja, regras tributárias padrão e chaves de API."
  }
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [tourActive, setTourActive] = useState(false);

  const storeName = tenant?.name || "Kivoni";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("lmfit-tour-completed");
      if (!completed) {
        const timer = setTimeout(() => {
          setTourActive(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen flex flex-col md:flex-row bg-[var(--lmfit-surface)]">
        {/* Mobile drawer backdrop */}
        {menuOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        {/* Sidebar: drawer on small screens */}
        <aside
          className={[
            "z-50 shrink-0 border-[var(--lmfit-border)] bg-[var(--card-bg)] md:sticky md:top-0 md:h-screen md:flex md:w-56 md:flex-col md:border-r",
            menuOpen
              ? "fixed inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r shadow-lg md:shadow-none"
              : "hidden md:flex",
          ].join(" ")}
          style={{ borderColor: lmfitTokens.border }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 md:block">
            <Link
              href="/dashboard"
              className="inline-flex py-2 md:mx-0"
              onClick={() => setMenuOpen(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
                alt={storeName}
                className="h-10 w-auto object-contain object-left max-w-[150px]"
              />
            </Link>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md text-2xl leading-none md:hidden"
              aria-label="Fechar"
              onClick={() => setMenuOpen(false)}
            >
              ×
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm font-medium">
            {navKeys.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  id={`sidebar-nav-${item.key.replace("nav.", "")}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                  style={{
                    backgroundColor: active ? `color-mix(in srgb, ${lmfitTokens.primary} 15%, transparent)` : "transparent",
                    color: active ? lmfitTokens.primary : lmfitTokens.textMuted,
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={18} />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-12 border-b border-[var(--lmfit-border)] bg-[var(--card-bg)] flex items-center justify-between px-3 md:px-4 gap-2">
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md border md:hidden text-lg"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>
            <div className="flex-1 md:flex-none" />
            <UserMenu onStartTour={() => setTourActive(true)} />
          </header>
          <main className="p-4 md:p-6 max-w-6xl w-full mx-auto flex-1">{children}</main>
        </div>
      </div>
      <TourGuide active={tourActive} onClose={() => setTourActive(false)} navKeys={navKeys} t={t} />
    </RequireAuth>
  );
}


function HelpDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const sections = [
    {
      category: "📊 GESTÃO COMERCIAL & VENDAS",
      items: [
        { icon: LayoutDashboard, title: "Início (Dashboard)", desc: "Gráficos de vendas diárias, KPIs de faturamento e alertas de ações." },
        { icon: Smartphone, title: "PDV Mobile", desc: "Interface de caixa rápida otimizada para celulares e tablets." },
        { icon: ShoppingCart, title: "Pedidos", desc: "Acompanhe todo o status da venda: Separando, Enviado, Concluído ou Cancelado." },
        { icon: Tag, title: "Promoções", desc: "Crie cupons de desconto percentual ou valor fixo pro checkout e PDV." },
        { icon: Layers, title: "Edição em Lote", desc: "Ajuste preços, estoque e custos de vários produtos ao mesmo tempo." },
        { icon: Warehouse, title: "Estoque Multi-local", desc: "Cadastre depósitos e lojas físicas e transfira estoque entre eles." }
      ]
    },
    {
      category: "🎯 CRM & RELACIONAMENTO",
      items: [
        { icon: Users, title: "Clientes", desc: "Ficha cadastral completa, histórico detalhado de compras e Lifetime Value (LTV)." },
        { icon: Filter, title: "CRM · Funil", desc: "Quadro Kanban de negociações e leads com colunas customizáveis." },
        { icon: CheckSquare, title: "CRM · Tarefas", desc: "Agenda de pendências comerciais e pós-vendas integrada aos contatos." },
        { icon: UserCheck, title: "CRM · Segmentos", desc: "Agrupamento inteligente da base de clientes para ações estratégicas de marketing." }
      ]
    },
    {
      category: "✂️ PRODUÇÃO & INSUMOS (CONFECÇÃO)",
      items: [
        { icon: Scissors, title: "Produção", desc: "Controle industrial de confecção por lotes com custo unitário real por peça e Kanban customizável." },
        { icon: Package, title: "Produtos", desc: "Grade de cor x tamanho com o inovador gerador dinâmico e inteligente de SKU em tempo real." },
        { icon: CreditCard, title: "Compras", desc: "Lançamento de aquisições de malhas, tecidos e aviamentos de fornecedores." },
        { icon: Truck, title: "Fornecedores", desc: "Cadastro de malharias, oficinas de corte e facções de costura." }
      ]
    },
    {
      category: "💸 CONTROLE FINANCEIRO & FISCAL",
      items: [
        { icon: Wallet, title: "Financeiro", desc: "Fluxo de caixa diário, importador de PDFs InfinitePay e DRE automático com Simples Nacional." },
        { icon: FileText, title: "Contas a Receber", desc: "Acompanhe títulos, vencimentos e status de pagamento das vendas a prazo." },
        { icon: Receipt, title: "Módulo Fiscal", desc: "Configure CNPJ e token da Focus NFe e emita notas fiscais (NF-e/NFC-e) por pedido, integradas à SEFAZ." },
        { icon: BarChart, title: "Relatórios", desc: "Análise gerencial detalhada de lucratividade, exportações Excel e curva ABC." },
        { icon: MessageSquare, title: "WhatsApp", desc: "Automação de alertas de cobrança, códigos Pix e status de envio." }
      ]
    },
    {
      category: "⚙️ CONFIGURAÇÕES & SEGURANÇA",
      items: [
        { icon: User, title: "Usuários", desc: "Cadastro de funcionários, perfis e permissões de acesso ao ERP." },
        { icon: Settings, title: "Configurações", desc: "Configurações gerais da empresa, impostos padrão e chaves de API." }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div 
        className="relative bg-[var(--card-bg)] rounded-xl shadow-2xl border w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg, #ffffff)", color: "var(--lmfit-text, #111827)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: lmfitTokens.border }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: lmfitTokens.primary }}>
              ✨ Manual de Funcionalidades Kivoni ERP
            </h2>
            <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
              Guia completo de tudo o que cada tópico do menu lateral faz e como o ecossistema se integra.
            </p>
          </div>
          <button 
            type="button" 
            className="hover:bg-gray-100 dark:hover:bg-white/10 rounded-md p-1.5 transition-colors text-2xl leading-none"
            style={{ color: lmfitTokens.textMuted }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((sec) => (
              <div key={sec.category} className="space-y-3 p-4 rounded-xl border bg-gray-50/50 dark:bg-white/5" style={{ borderColor: lmfitTokens.border }}>
                <h3 className="text-xs font-bold tracking-wider" style={{ color: lmfitTokens.primary }}>
                  {sec.category}
                </h3>
                <div className="space-y-3.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold leading-none mb-1" style={{ color: lmfitTokens.text }}>
                            {item.title}
                          </h4>
                          <p className="text-xs leading-normal" style={{ color: lmfitTokens.textMuted }}>
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50/80 dark:bg-white/5 flex justify-end" style={{ borderColor: lmfitTokens.border }}>
          <button
            type="button"
            className="px-5 py-2.5 rounded-md text-white font-semibold text-sm hover:bg-blue-700 transition-colors cursor-pointer"
            style={{ backgroundColor: lmfitTokens.primary }}
            onClick={onClose}
          >
            Fechar Manual
          </button>
        </div>
      </div>
    </div>
  );
}

function UserMenu({ onStartTour }: { onStartTour: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetTenant = useTenantStore((s) => s.resetTenant);
  const { tenant } = useTenant();
  const [helpOpen, setHelpOpen] = useState(false);

  const maxUsers = tenant?.limits?.maxUsers ?? 1;
  const userLimitText = maxUsers === -1 ? "Ilimitado" : maxUsers.toString();

  async function handleLogout() {
    await logout();
    // Limpa o cache de tenant para forçar re-fetch na próxima loja acessada
    resetTenant();
    // Redireciona para login — o token deste slug já foi removido
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      <div className="hidden sm:flex flex-col items-end text-right">
        <span className="text-sm font-semibold text-[var(--lmfit-text)] leading-tight">
          {user?.name}
        </span>
        {tenant && (
          <span className="text-[10px] text-[var(--lmfit-muted)] font-medium bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full mt-0.5 border border-[var(--lmfit-border)] capitalize">
            Plano: {tenant.plan} (Até {userLimitText} {maxUsers === 1 ? "usuário" : "usuários"})
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onStartTour}
        className="flex items-center gap-1.5 text-xs font-semibold min-h-11 px-3.5 rounded-md border touch-manipulation hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
      >
        ✨ Fazer Tour
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm min-h-11 px-3 rounded-md border touch-manipulation cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
      >
        Sair
      </button>

      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function TourGuide({
  active,
  onClose,
  navKeys,
  t
}: {
  active: boolean;
  onClose: () => void;
  navKeys: { href: string; key: string; icon: any }[];
  t: (k: string) => string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; width?: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeItem = navKeys[currentStep];
  
  useEffect(() => {
    if (!active || !activeItem) return;
    
    if (!isMobile) {
      const elementId = `sidebar-nav-${activeItem.key.replace("nav.", "")}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        
        const timer = setTimeout(() => {
          const rect = element.getBoundingClientRect();
          setPopoverCoords({
            top: rect.top + window.scrollY,
            left: rect.left + rect.width + 16,
            width: rect.width
          });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, active, activeItem, isMobile]);

  if (!active || !activeItem) return null;

  const totalSteps = navKeys.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  const ActiveIcon = activeItem.icon;

  const tourInfo = tourStepsInfo[activeItem.key] || {
    title: t(activeItem.key),
    desc: "Acesse esta funcionalidade pelo menu lateral."
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem("lmfit-tour-completed", "true");
      onClose();
      setCurrentStep(0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("lmfit-tour-completed", "true");
    onClose();
    setCurrentStep(0);
  };

  const elementId = `sidebar-nav-${activeItem.key.replace("nav.", "")}`;
  const element = typeof document !== "undefined" ? document.getElementById(elementId) : null;
  const targetRect = element?.getBoundingClientRect();

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      {!isMobile && targetRect ? (
        <div
          style={{
            position: "absolute",
            top: `${targetRect.top + window.scrollY}px`,
            left: `${targetRect.left + window.scrollX}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            borderRadius: "8px",
            border: `2px solid ${lmfitTokens.primary}`,
            pointerEvents: "auto",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 99998,
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(2px)",
            pointerEvents: "auto",
            zIndex: 99998,
          }}
        />
      )}

      <div
        className="pointer-events-auto w-80 bg-white/95 dark:bg-neutral-900/95 rounded-xl border p-5 shadow-2xl flex flex-col transition-all duration-300 animate-in fade-in zoom-in-95"
        style={
          isMobile || !popoverCoords
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                borderColor: lmfitTokens.border,
                zIndex: 99999,
              }
            : {
                position: "absolute",
                top: `${popoverCoords.top}px`,
                left: `${popoverCoords.left}px`,
                borderColor: lmfitTokens.border,
                zIndex: 99999,
              }
        }
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-neutral-800 rounded-t-xl overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: lmfitTokens.primary,
            }}
          />
        </div>

        <div className="flex items-center gap-3 mb-3 mt-1">
          <div
            className="p-2 rounded-lg text-white shrink-0"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            <ActiveIcon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="text-[10px] font-bold uppercase tracking-wider block"
              style={{ color: lmfitTokens.primary }}
            >
              Passo {currentStep + 1} de {totalSteps}
            </span>
            <h4
              className="text-sm font-bold truncate leading-tight dark:text-white"
              style={{ color: lmfitTokens.text }}
            >
              {tourInfo.title}
            </h4>
          </div>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
          {tourInfo.desc}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t dark:border-neutral-800">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            Pular Tour
          </button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-2.5 py-1.5 rounded text-xs font-semibold border dark:border-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Voltar
              </button>
            )}
            
            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded text-xs font-bold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {currentStep === totalSteps - 1 ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
