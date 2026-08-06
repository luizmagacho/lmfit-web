"use client";

import * as React from "react";

/** Loop 21 — "estender, não recriar" (STOREFRONT-V3-FIDELIDADE.md §4): `"horizontal"` é a faixa
 *  marquee de sempre (Loop 12), default — nenhum chamador existente muda de comportamento sem
 *  passar a prop explicitamente. `"diagonal"` é o selo de canto rotacionado (fita industrial em
 *  ângulo, um segundo motivo Off-White reconhecível), pensado pra ficar sobre uma imagem (ex.: a
 *  galeria da PDP), não como barra full-width. */
export type MarqueeTapeVariant = "horizontal" | "diagonal";

/** Loop 12 — "fita de perigo" da família industrial (wireframe Off-White: faixa marquee). Reusa a
 *  MESMA animação CSS do AnnouncementTicker (.kivoni-ticker-track, duas cópias deslizando -50%),
 *  só com visual próprio: fundo preto, texto mono repetido. Decorativa — aria-hidden. */
export function MarqueeTape({ text, variant = "horizontal" }: { text: string; variant?: MarqueeTapeVariant }) {
  if (variant === "diagonal") {
    return (
      <div
        aria-hidden
        className="absolute top-3 -right-12 w-44 rotate-45 select-none overflow-hidden z-10"
      >
        <div className="py-1 text-center" style={{ backgroundColor: "#000" }}>
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "#fff", fontFamily: "'Space Mono', monospace" }}
          >
            {text}
          </span>
        </div>
      </div>
    );
  }

  const repeated = Array.from({ length: 10 }, () => text);
  return (
    <div
      aria-hidden
      className="overflow-hidden select-none border-y-2"
      style={{ backgroundColor: "#000", borderColor: "#000" }}
    >
      <div className="kivoni-ticker-track flex whitespace-nowrap py-1.5">
        {[0, 1].map((copy) => (
          <span key={copy} className="flex">
            {repeated.map((t, i) => (
              <span
                key={`${copy}-${i}`}
                className="text-[11px] font-bold uppercase tracking-widest px-4"
                style={{ color: "#fff", fontFamily: "'Space Mono', monospace" }}
              >
                {t} ·
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
