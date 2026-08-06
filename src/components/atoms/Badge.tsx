import * as React from "react";
import type { ReactNode } from "react";
import { lmfitTokens } from "@/theme/tokens";

export type BadgeVariant =
  | "neutral"
  | "atacado"
  | "varejo"
  | "pago"
  | "pendente"
  | "estornado"
  | "lancamento"
  | "estoque"
  | "desconto"
  | "sob-encomenda";

function palette(v: BadgeVariant): { bg: string; fg: string; border: string } {
  switch (v) {
    case "atacado":
      return { bg: "#0b3d91", fg: "#ffffff", border: "#0b3d91" };
    case "varejo":
      return { bg: lmfitTokens.primary, fg: "#ffffff", border: lmfitTokens.primary };
    case "pago":
      return { bg: lmfitTokens.success, fg: "#ffffff", border: lmfitTokens.success };
    case "pendente":
      return { bg: "#f4c430", fg: "#1b1b1b", border: "#c79b00" };
    case "estornado":
      return { bg: lmfitTokens.error, fg: "#ffffff", border: lmfitTokens.error };
    case "lancamento":
      return { bg: "#6b21a8", fg: "#ffffff", border: "#6b21a8" };
    case "estoque":
      return { bg: "#15803d", fg: "#ffffff", border: "#15803d" };
    case "desconto":
      return { bg: lmfitTokens.error, fg: "#ffffff", border: lmfitTokens.error };
    case "sob-encomenda":
      return { bg: "#c2410c", fg: "#ffffff", border: "#c2410c" };
    default:
      return { bg: lmfitTokens.surface, fg: lmfitTokens.text, border: lmfitTokens.border };
  }
}

export function Badge({
  variant = "neutral",
  children,
  title,
  size = "sm",
  sticker = false,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  title?: string;
  size?: "xs" | "sm" | "md";
  /** Loop 20 — cara de adesivo (rotação leve + sombra) em vez de pílula neutra. Prop explícita do
   *  chamador, não lida do tema: `Badge` também é usado fora de `/loja` (admin/PDV), onde não há
   *  contexto de preset (Loop 4d já estabeleceu essa fronteira). Hoje só o storefront Tropical
   *  (`layoutFamily === "expressive"`) passa `true`. */
  sticker?: boolean;
}) {
  const p = palette(variant);
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs";
  const stickerClass = sticker ? "rotate-[-6deg] shadow-md border-2" : "";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${pad} ${stickerClass}`}
      style={{ backgroundColor: p.bg, color: p.fg, borderColor: p.border }}
      title={title}
    >
      {children}
    </span>
  );
}
