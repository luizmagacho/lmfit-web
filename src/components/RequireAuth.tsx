"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useRouter();
  const pathname = usePathname();

  // Papel `vendedor` é restrito ao PDV — nenhuma outra tela do painel checa role nenhuma, então
  // o bloqueio tem que ficar aqui, no único ponto que todo (app) e (pdv) atravessam.
  const isVendedorOutsidePdv = user?.role === "vendedor" && !pathname.startsWith("/pdv");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && isVendedorOutsidePdv) {
      router.replace("/pdv");
    }
  }, [loading, user, isVendedorOutsidePdv, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--lmfit-surface)] text-[var(--lmfit-text)]">
        Carregando…
      </div>
    );
  }

  if (!user) return null;
  if (isVendedorOutsidePdv) return null;

  return <>{children}</>;
}
