"use client";

import { usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";

/**
 * Ticker de avisos do topo, com as mensagens do tenant (Loop 4). Sem mensagens configuradas,
 * não renderiza nada — não força um placeholder genérico em quem não configurou.
 */
export function AnnouncementTicker() {
  const { tenant } = useTenant();
  const pathname = usePathname();
  const messages = tenant?.storefront?.announcements ?? [];

  // payment-simulation renderiza sua própria tela isolada — mesma exceção do PublicHeader.
  if (pathname?.startsWith("/checkout/payment-simulation")) return null;
  if (messages.length === 0) return null;

  // Duplica a lista pra criar um loop contínuo sem salto perceptível na animação CSS.
  const loopMessages = [...messages, ...messages];

  return (
    <div
      className="w-full overflow-hidden border-b"
      style={{ borderColor: "var(--kivoni-border)", backgroundColor: "var(--kivoni-primary)" }}
      aria-hidden={messages.length === 0}
    >
      <div className="kivoni-ticker-track flex items-center gap-12 py-2 whitespace-nowrap">
        {loopMessages.map((msg, i) => (
          <span key={i} className="text-xs font-medium px-2" style={{ color: "white" }}>
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
