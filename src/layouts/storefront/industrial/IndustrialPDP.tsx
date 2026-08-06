"use client";

import * as React from "react";
import Image from "next/image";
import { MarqueeTape } from "@/components/organisms/MarqueeTape";
import type { PdpSlots } from "../types";

/** Família industrial: moodboard assimétrico — TODAS as fotos de uma vez num grid de bordas
 *  duras (nada de carrossel), rótulos entre aspas, caixa de compra emoldurada em preto. Loop 21 —
 *  fita diagonal "ORIGINAL" sobre a galeria (`MarqueeTape` `variant="diagonal"`, estende o
 *  componente já usado em `IndustrialHome`, não recria). */
export function IndustrialPDP({ slots }: { slots: PdpSlots }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-32">
      {slots.backLink}
      <div className="lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        <div className="lg:col-span-3">
          <p className="text-xs font-bold uppercase mb-2 text-[var(--foreground)]">
            “{slots.productName}”
          </p>
          {slots.urls.length > 1 ? (
            <div className="relative overflow-hidden grid grid-cols-2 gap-1.5">
              <MarqueeTape text="ORIGINAL" variant="diagonal" />
              {slots.urls.map((u, i) => (
                <div
                  key={u + i}
                  // Primeira foto ocupa a linha inteira — o "caos organizado" do moodboard.
                  className={`relative aspect-square ${i === 0 ? "col-span-2" : ""}`}
                  style={{ border: "2px solid #000" }}
                >
                  <Image
                    src={u}
                    alt={i === 0 ? slots.productName : ""}
                    fill
                    priority={i === 0}
                    sizes={i === 0 ? "100vw" : "50vw"}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden p-1.5" style={{ border: "2px solid #000" }}>
              <MarqueeTape text="ORIGINAL" variant="diagonal" />
              {slots.gallery}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 mt-6 lg:mt-0 p-4" style={{ border: "2px solid #000" }}>
          {slots.info}
        </div>
      </div>
      {slots.related}
    </div>
  );
}
