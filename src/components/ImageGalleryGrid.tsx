"use client";

import { useState } from "react";
import { lmfitTokens } from "@/theme/tokens";

type Props = {
  urls: string[];
  onRemoveIndex?: (index: number) => void;
  className?: string;
};

/**
 * Pré-visualização em grelha para várias imagens (ex.: formulário de produto).
 */
export function ImageGalleryGrid({ urls, onRemoveIndex, className }: Props) {
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  if (urls.length === 0) {
    return (
      <div
        className={[
          "flex min-h-34 w-full items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
      >
        Nenhuma imagem ainda. Adicione arquivos na área abaixo.
      </div>
    );
  }

  return (
    <>
      <div
        className={[
          "max-h-[min(22rem,50vh)] w-full overflow-y-auto rounded-lg border bg-neutral-50/60 dark:bg-white/5 p-3 sm:p-4",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ borderColor: lmfitTokens.border }}
      >
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {urls.map((src, i) => (
            <li
              key={`${i}-${src.slice(0, 80)}`}
              className="relative aspect-square overflow-hidden rounded-md border bg-[var(--card-bg)] shadow-sm group"
              style={{ borderColor: lmfitTokens.border }}
            >
              {broken[i] ? (
                <div
                  className="flex h-full w-full items-center justify-center p-2 text-center text-[10px] leading-tight"
                  style={{ color: lmfitTokens.textMuted }}
                >
                  Não foi possível carregar
                </div>
              ) : (
                <div className="h-full w-full cursor-zoom-in" onClick={() => setZoomedIndex(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setBroken((b) => ({ ...b, [i]: true }))}
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                </div>
              )}
              {onRemoveIndex ? (
                <button
                  type="button"
                  aria-label="Remover imagem"
                  className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sm font-medium text-white shadow-md touch-manipulation hover:bg-black/70"
                  onClick={() => onRemoveIndex(i)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {zoomedIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 transition-opacity duration-300 backdrop-blur-sm"
          onClick={() => setZoomedIndex(null)}
        >
          <div className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center">
            <button
              type="button"
              className="absolute top-2 right-2 md:top-6 md:right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors text-2xl"
              onClick={(e) => { e.stopPropagation(); setZoomedIndex(null); }}
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[zoomedIndex]}
              alt="Zoomed"
              className="max-w-full max-h-full object-contain rounded-md shadow-2xl scale-100 animate-[zoomIn_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            />
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors text-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedIndex((prev) => (prev! > 0 ? prev! - 1 : urls.length - 1));
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors text-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedIndex((prev) => (prev! < urls.length - 1 ? prev! + 1 : 0));
                  }}
                >
                  ›
                </button>
              </>
            )}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes zoomIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </>
  );
}
