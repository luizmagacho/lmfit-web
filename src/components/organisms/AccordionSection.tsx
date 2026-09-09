"use client";

import * as React from "react";
import { useState } from "react";
import { lmfitTokens } from "@/theme/tokens";

/** Loop 28 — seção colapsável para a coluna de informação da PDP. Só a família minimal (Luxo/
 *  Wellness/Minimal) usa isso hoje (`ProductDetailClient.tsx`) — as outras 9 famílias continuam
 *  com o parágrafo corrido de sempre, sem regressão. */
export function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderTop: `1px solid ${lmfitTokens.border}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 text-left text-xs font-medium uppercase tracking-[0.08em]"
        style={{ color: lmfitTokens.text }}
      >
        {title}
        <span aria-hidden style={{ color: lmfitTokens.textMuted }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="pb-4 text-xs leading-relaxed" style={{ color: lmfitTokens.textMuted }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
