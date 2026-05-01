import { Suspense } from "react";
import { EscalationsClient } from "./EscalationsClient";

export default function EscalationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500 p-4">Carregando…</p>}>
      <EscalationsClient />
    </Suspense>
  );
}
