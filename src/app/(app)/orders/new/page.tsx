import { Suspense } from "react";
import { OrderEditorClient } from "../OrderEditorClient";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <OrderEditorClient orderId={null} />
    </Suspense>
  );
}
