import { Suspense } from "react";
import { ContaClient } from "./ContaClient";

export const dynamic = "force-dynamic";

export default function ContaPage() {
  return (
    <Suspense fallback={null}>
      <ContaClient />
    </Suspense>
  );
}
