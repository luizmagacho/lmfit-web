"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Loop 10 — sem isso, erros de renderização do React (diferente de erros JS soltos, que
// window.onerror já cobre) nunca chegam ao Sentry: o próprio Next intercepta o erro pra mostrar
// sua tela de fallback e não repassa pra mais ninguém a menos que essa tela chame Sentry.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>Algo deu errado.</p>
          <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#666" }}>
            Tente recarregar a página.
          </p>
        </div>
      </body>
    </html>
  );
}
