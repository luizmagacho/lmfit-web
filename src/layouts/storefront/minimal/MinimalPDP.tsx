"use client";

import * as React from "react";
import type { PdpSlots } from "../types";

/** Família minimal: 60/40 com MUITO respiro — foto gigante, informação fina e espaçada, sem
 *  competição visual. O produto fala sozinho. */
export function MinimalPDP({ slots }: { slots: PdpSlots }) {
  return (
    <div className="space-y-16 max-w-5xl mx-auto pb-32 pt-6">
      {slots.backLink}
      <div className="lg:grid lg:grid-cols-5 lg:gap-14 lg:items-start">
        <div className="lg:col-span-3 space-y-3">
          {slots.gallery}
          {slots.thumbs}
        </div>
        <div className="lg:col-span-2 mt-10 lg:mt-0 lg:pt-8">{slots.info}</div>
      </div>
      <div className="pt-8">{slots.related}</div>
    </div>
  );
}
