"use client";

import * as React from "react";
import type { PdpSlots } from "../types";

/** Família editorial: a foto manda — galeria ocupa 60% (3/5) e fica sticky, a caixa de compra
 *  acompanha o scroll na coluna menor. Container mais largo pra foto respirar. */
export function EditorialPDP({ slots }: { slots: PdpSlots }) {
  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-32">
      {slots.backLink}
      <div className="lg:grid lg:grid-cols-5 lg:gap-10 lg:items-start">
        <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-2">
          {slots.gallery}
          {slots.thumbs}
        </div>
        <div className="lg:col-span-2 lg:sticky lg:top-4 mt-8 lg:mt-0">{slots.info}</div>
      </div>
      {slots.related}
    </div>
  );
}
