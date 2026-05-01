"use client";

import { useEffect } from "react";
import { useAuthStore, type AuthUser } from "@/stores/useAuthStore";

export type { AuthUser };

/**
 * Mantido por compatibilidade. O estado real vive em `useAuthStore` (Zustand).
 * Este componente apenas dispara a inicializacao.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  return <>{children}</>;
}

/**
 * Hook compativel com a API anterior. Internamente usa Zustand.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  return { user, loading, login, logout };
}
