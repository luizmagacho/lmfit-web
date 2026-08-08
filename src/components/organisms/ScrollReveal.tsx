"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

/** Loop 25 — checagem centralizada de `prefers-reduced-motion`; `ScrollReveal` e o hide-on-scroll
 *  do header usam a MESMA função, pra nenhum dos dois animar quando o usuário pediu menos
 *  movimento. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Loop 25 — fade + translate-up quando o elemento entra na viewport (`IntersectionObserver`,
 *  dispara uma vez só). Duração/curva vêm dos MESMOS tokens de motion já reais desde o Loop 20
 *  (`--kivoni-storefront-motion-duration`/`-easing`) — nenhuma animação nova por preset: o
 *  Tropical bounça de verdade por causa da própria curva `cubic-bezier` com overshoot, o Atlético
 *  é rápido, o Minimal é praticamente instantâneo (`linear`/80ms, "cortes secos" já é o token
 *  dele). Com `prefers-reduced-motion`, pula a animação inteira — o conteúdo já nasce visível. */
export function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    // threshold: 0 (não 0.15) — o alvo pode ser um bloco arbitrariamente alto (ex.: a grade
    // inteira do catálogo, centenas de produtos): exigir 15% da PRÓPRIA área do elemento visível
    // nunca é satisfeito quando o elemento é mais alto que `15% > altura da viewport`, travando
    // a animação em opacity:0 pra sempre. threshold 0 revela assim que o primeiro pixel entra.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(16px)",
        transitionProperty: "opacity, transform",
        transitionDuration: "var(--kivoni-storefront-motion-duration)",
        transitionTimingFunction: "var(--kivoni-storefront-motion-easing)",
      }}
    >
      {children}
    </div>
  );
}
