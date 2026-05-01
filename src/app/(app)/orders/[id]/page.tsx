import { Suspense } from "react";
import { OrderEditorClient } from "../OrderEditorClient";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <OrderEditorClient orderId={id} />
    </Suspense>
  );
}
