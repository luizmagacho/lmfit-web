import type { Metadata } from "next";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "PDV · LM FIT",
};

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
