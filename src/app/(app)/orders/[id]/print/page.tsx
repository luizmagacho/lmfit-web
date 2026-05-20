import { Suspense } from "react";
import { PrintOrderClient } from "./PrintOrderClient";

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <PrintOrderClient orderId={id} />
    </Suspense>
  );
}
