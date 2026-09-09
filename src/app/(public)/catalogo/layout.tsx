import type { ReactNode } from "react";
import { CatalogFloatingCart } from "@/components/organisms/CatalogFloatingCart";
import { ForceCartRole } from "@/components/ForceCartRole";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ForceCartRole mode="atacado" />
      {children}
      <CatalogFloatingCart />
    </>
  );
}
