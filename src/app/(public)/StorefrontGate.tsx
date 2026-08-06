"use client";

import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

/**
 * Liga/desliga a loja pública (Loop 4). Só mostra o estado "indisponível" quando o tenant já
 * carregou de verdade e `storefront.enabled` é explicitamente `false` — nunca durante o loading
 * inicial (que deixaria a mensagem piscar antes do dado real chegar) nem em caso de falha de rede.
 */
export function StorefrontGate({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useTenant();

  if (!loading && tenant && tenant.storefront?.enabled === false) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{ backgroundColor: "var(--kivoni-surface)" }}
      >
        <p className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
          Loja temporariamente indisponível
        </p>
        <p className="mt-2 text-sm max-w-sm" style={{ color: lmfitTokens.textMuted }}>
          {tenant?.name || "Esta loja"} não está aceitando pedidos no momento. Volte mais tarde.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
