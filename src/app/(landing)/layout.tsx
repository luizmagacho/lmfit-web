import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivoni — A loja completa pra quem vende moda de verdade",
  description:
    "Catálogo com tema próprio, pedido pelo WhatsApp, caixa da loja física e atacado — tudo com o mesmo estoque, sem planilha duplicada.",
  keywords: ["catálogo online", "white label", "e-commerce", "loja virtual", "WhatsApp", "PDV"],
  openGraph: {
    title: "Kivoni — A loja completa pra quem vende moda de verdade",
    description: "Catálogo com tema próprio, pedido pelo WhatsApp, caixa da loja física e atacado — tudo no mesmo estoque.",
    type: "website",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
