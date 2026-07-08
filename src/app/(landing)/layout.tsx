import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kivoni — Sua marca. Seu catálogo. Sem limites.",
  description:
    "Plataforma white-label para lojistas. Crie seu catálogo online profissional, gerencie estoque, receba pedidos via WhatsApp e muito mais.",
  keywords: ["catálogo online", "white label", "e-commerce", "loja virtual", "WhatsApp"],
  openGraph: {
    title: "Kivoni — Sua marca. Seu catálogo. Sem limites.",
    description: "Plataforma white-label para lojistas criarem sua loja online profissional.",
    type: "website",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dark">{children}</div>;
}
