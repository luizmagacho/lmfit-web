import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ChatWidget } from "@/components/organisms/ChatWidget";

export const metadata: Metadata = {
  title: "Kivoni - Catálogo",
  description: "Catálogo de produtos Kivoni",
};
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--lmfit-surface)] text-[var(--foreground)] pb-28">
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
      <ChatWidget />
    </div>
  );
}
