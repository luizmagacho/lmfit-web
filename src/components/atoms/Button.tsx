import * as React from "react";
import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { lmfitTokens } from "@/theme/tokens";
import type { ButtonStyle } from "@/theme/storefrontPresets";

type ButtonProps = {
  variant?: ButtonStyle;
  /** Só para o mockup do seletor de estilo em Settings — cada preset precisa mostrar o próprio
   *  raio, independente do preset realmente salvo (que é o que `--kivoni-radius` sempre reflete).
   *  Sem essa prop, usa a CSS var normal — comportamento padrão em toda a `/loja`. */
  radius?: number | string;
  /** Idem, mas pra cor — o preview de Settings precisa refletir a `primaryColor` ainda não salva
   *  (estado do form), não a `--kivoni-primary` do tenant salvo no banco. */
  color?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Pura — sem depender de render — pra ser testável sem `@testing-library/react` (esse projeto só
 * transforma JSX via esbuild "classic", exigiria `import React` em todo componente pra RTL
 * funcionar; nenhum outro atom faz isso, então a lógica visual fica isolada aqui em vez de forçar
 * essa exceção só pelo `Button`).
 */
export function resolveButtonVisualStyle(
  variant: ButtonStyle,
  radiusOverride?: number | string,
  colorOverride?: string,
): CSSProperties {
  const radius = variant === "pill" ? "999px" : (radiusOverride ?? lmfitTokens.radius);
  const color = colorOverride ?? lmfitTokens.primary;
  const variantStyle =
    variant === "ghost"
      ? { backgroundColor: "transparent", color, borderColor: color }
      : { backgroundColor: color, color: "#fff", borderColor: color };
  return { borderRadius: radius, ...variantStyle };
}

/**
 * Loop 4c — primeiro consumidor real de `ButtonStyle` (solid/ghost/pill), até agora só dado morto
 * em `storefrontPresets.ts` desde o Loop 4 (não havia `<Button>` compartilhado).
 */
export function Button({ variant = "solid", radius, color, className = "", style, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-11 px-5 text-sm font-semibold border transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${className}`}
      style={{ ...resolveButtonVisualStyle(variant, radius, color), ...style }}
      {...rest}
    />
  );
}
