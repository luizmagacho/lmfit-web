import type { ReactNode } from "react";
import { CatalogFloatingCart } from "@/components/organisms/CatalogFloatingCart";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CatalogFloatingCart />
    </>
  );
}
