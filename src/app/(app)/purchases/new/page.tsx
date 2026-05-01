import { Suspense } from "react";
import { PurchaseEditorClient } from "../PurchaseEditorClient";

export default function NewPurchasePage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <PurchaseEditorClient purchaseId={null} />
    </Suspense>
  );
}
