import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "PDV · Kivoni",
};

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
