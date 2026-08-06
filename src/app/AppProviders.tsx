"use client";

import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

/**
 * Bundle de Providers (tema/tenant/idioma/auth) + Toaster — usado pelos grupos de rota que
 * realmente precisam (app, pdv, public). Fora do layout raiz de propósito: a landing (marketing)
 * não usa nenhum desses contextos nem dispara toast(), então não deve pagar o custo deles no
 * primeiro acesso (ver docs/ecommerce ou o changelog de performance para o porquê).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm",
          style: {
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #333",
          },
        }}
      />
    </Providers>
  );
}
