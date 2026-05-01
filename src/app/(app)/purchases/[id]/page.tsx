import { Suspense } from "react";
import { PurchaseEditorClient } from "../PurchaseEditorClient";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <PurchaseEditorClient purchaseId={id} />
    </Suspense>
  );
}
