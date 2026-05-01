"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { RequireAuth } from "@/components/RequireAuth";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";

const nav = [
  { href: "/dashboard", label: "Início" },
  { href: "/pdv", label: "PDV Mobile" },
  { href: "/inventory", label: "Edição em lote" },
  { href: "/customers", label: "Clientes" },
  { href: "/crm/pipeline", label: "CRM · Funil" },
  { href: "/crm/tasks", label: "CRM · Tarefas" },
  { href: "/crm/segments", label: "CRM · Segmentos" },
  { href: "/suppliers", label: "Fornecedores" },
  { href: "/products", label: "Produtos" },
  { href: "/orders", label: "Pedidos" },
  { href: "/purchases", label: "Compras" },
  { href: "/invoices", label: "Notas fiscais" },
  { href: "/reports", label: "Relatórios" },
  { href: "/drafts", label: "Rascunhos" },
  { href: "/escalations", label: "WhatsApp" },
  { href: "/users", label: "Usuários" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

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
            "z-50 shrink-0 border-[var(--lmfit-border)] bg-white md:static md:flex md:w-56 md:flex-col md:border-r",
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
          <nav className="flex flex-col gap-1 px-2 pb-4 overflow-y-auto">
            {nav.map((item) => (
              <NavLink key={item.href} {...item} onNavigate={() => setMenuOpen(false)} />
            ))}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="min-h-12 border-b border-[var(--lmfit-border)] bg-white flex items-center justify-between px-3 md:px-4 gap-2">
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

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`min-h-11 flex items-center px-3 py-2 rounded-md text-sm ${
        active ? "font-medium" : "text-[var(--lmfit-muted)] hover:bg-black/5"
      }`}
      style={
        active
          ? {
              backgroundColor: lmfitTokens.surface,
              color: lmfitTokens.accentBlue,
            }
          : { color: lmfitTokens.textMuted }
      }
    >
      {label}
    </Link>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-sm text-[var(--lmfit-muted)] truncate max-w-[140px] sm:max-w-[200px]">
        {user?.name}
      </span>
      <button
        type="button"
        onClick={() => void logout().then(() => (window.location.href = "/login"))}
        className="text-sm min-h-11 px-3 rounded-md border touch-manipulation"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
      >
        Sair
      </button>
    </div>
  );
}
