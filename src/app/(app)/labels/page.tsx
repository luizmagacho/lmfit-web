import { Suspense } from "react";
import { LabelsClient } from "./LabelsClient";

export default function LabelsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Carregando…</p>}>
      <LabelsClient />
    </Suspense>
  );
}
