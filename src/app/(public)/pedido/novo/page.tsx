import { Suspense } from "react";
import { PedidoNovoClient } from "./pedido-client";

export default function PedidoNovoPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--lmfit-muted)] px-2 py-4">Carregando…</p>
      }
    >
      <PedidoNovoClient />
    </Suspense>
  );
}
