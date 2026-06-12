"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { RequireAuth } from "@/components/RequireAuth";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import { useLanguage } from "@/context/LanguageContext";

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
  Scissors
} from "lucide-react";

const navKeys = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/pdv", key: "nav.pdv", icon: Smartphone },
  { href: "/inventory", key: "nav.inventory", icon: Layers },
  { href: "/customers", key: "nav.customers", icon: Users },
  { href: "/crm/pipeline", key: "nav.pipeline", icon: Filter },
  { href: "/crm/tasks", key: "nav.tasks", icon: CheckSquare },
  { href: "/crm/segments", key: "nav.segments", icon: UserCheck },
  { href: "/suppliers", key: "nav.suppliers", icon: Truck },
  { href: "/products", key: "nav.products", icon: Package },
  { href: "/materials", key: "nav.materials", icon: Layers },
  { href: "/orders", key: "nav.orders", icon: ShoppingCart },
  { href: "/purchases", key: "nav.purchases", icon: CreditCard },
  { href: "/production", key: "nav.production", icon: Scissors },
  { href: "/invoices", key: "nav.invoices", icon: FileText },
  { href: "/financial", key: "nav.financial", icon: Wallet },
  { href: "/reports", key: "nav.reports", icon: BarChart },
  { href: "/escalations", key: "nav.escalations", icon: MessageSquare },
  { href: "/users", key: "nav.users", icon: User },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
              className="inline-flex rounded-md bg-black px-2.5 py-2 md:mx-0"
              onClick={() => setMenuOpen(false)}
            >
              <Image
                src={lmfitLogoSrc}
                alt="LM FIT"
                width={132}
                height={44}
                className="h-9 w-auto max-w-[9.5rem] object-contain object-left"
                priority
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
            <UserMenu />
          </header>
          <main className="p-4 md:p-6 max-w-6xl w-full mx-auto flex-1">{children}</main>
        </div>
      </div>
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
        { icon: Layers, title: "Edição em Lote", desc: "Ajuste preços, estoque e custos de vários produtos ao mesmo tempo." }
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
        { icon: FileText, title: "Notas Fiscais", desc: "Geração e emissão de notas fiscais (NF-e/NFC-e) integradas à SEFAZ." },
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
              ✨ Manual de Funcionalidades LM FIT ERP
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

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-sm text-[var(--lmfit-muted)] truncate max-w-[140px] sm:max-w-[200px]" style={{ color: lmfitTokens.textMuted }}>
        {user?.name}
      </span>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold min-h-11 px-3.5 rounded-md border touch-manipulation hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
      >
        ✨ Manual
      </button>
      <button
        type="button"
        onClick={() => void logout().then(() => (window.location.href = "/login"))}
        className="text-sm min-h-11 px-3 rounded-md border touch-manipulation cursor-pointer"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
      >
        Sair
      </button>

      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
