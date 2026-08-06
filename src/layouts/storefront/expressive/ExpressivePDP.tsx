"use client";

import * as React from "react";
import type { PdpSlots } from "../types";

/** Família expressive: a caixa de compra vive num cartão colorido de cantos bem arredondados
 *  (superfície do preset) — alegre, com a foto solta ao lado. */
export function ExpressivePDP({ slots }: { slots: PdpSlots }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32">
      {slots.backLink}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        <div className="lg:sticky lg:top-4 space-y-2">
          {slots.gallery}
          {slots.thumbs}
        </div>
        <div
          className="mt-6 lg:mt-0 rounded-3xl p-5 sm:p-6"
          style={{ backgroundColor: "var(--kivoni-surface)" }}
        >
          {slots.info}
        </div>
      </div>
      {slots.related}
    </div>
  );
}
