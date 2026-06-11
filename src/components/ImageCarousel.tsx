"use client";

import { useEffect, useMemo, useState } from "react";
import { lmfitTokens } from "@/theme/tokens";

export type ImageCarouselSize = "sm" | "md" | "fill";

type Props = {
  urls: string[];
  size?: ImageCarouselSize;
  /** Remove control per slide (e.g. form editor). */
  onRemoveIndex?: (index: number) => void;
  className?: string;
};

const wrapSm = "relative h-20 w-20 shrink-0";
const wrapMd = "relative h-40 w-full max-w-[min(100%,20rem)]";
const wrapFill = "absolute inset-0 w-full h-full";

export function ImageCarousel({ urls, size = "sm", onRemoveIndex, className }: Props) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  const n = urls.length;
  const urlsKey = useMemo(() => JSON.stringify(urls), [urls]);
  useEffect(() => {
    setIndex((i) => (n ? Math.min(i, n - 1) : 0));
    setBroken({});
  }, [n, urlsKey]);

  const safeIdx = n ? Math.min(index, n - 1) : 0;
  const src = urls[safeIdx];

  if (!n) {
    return (
      <div
        className={[
          size === "sm" ? wrapSm : size === "fill" ? wrapFill : wrapMd,
          "rounded-md border border-dashed flex items-center justify-center text-xs px-1",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
      >
        —
      </div>
    );
  }

  const showNav = n > 1;
  const wrap = size === "sm" ? wrapSm : size === "fill" ? wrapFill : wrapMd;

  return (
    <div className={[wrap, "group", className].filter(Boolean).join(" ")}>
      <div
        className="h-full w-full overflow-hidden rounded-md border bg-neutral-100"
        style={{ borderColor: lmfitTokens.border }}
      >
        {broken[safeIdx] ? (
          <div
            className="flex h-full w-full items-center justify-center text-[10px] px-1 text-center"
            style={{ color: lmfitTokens.textMuted }}
          >
            Erro ao carregar
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className={size === "sm" || size === "fill" ? "h-full w-full object-cover" : "h-full w-full object-contain"}
            onError={() => setBroken((b) => ({ ...b, [safeIdx]: true }))}
          />
        )}
      </div>

      {showNav ? (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-r bg-black/50 px-1 py-1.5 text-sm leading-none text-white opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            onClick={() => setIndex((i) => (i - 1 + n) % n)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l bg-black/50 px-1 py-1.5 text-sm leading-none text-white opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            onClick={() => setIndex((i) => (i + 1) % n)}
          >
            ›
          </button>
          <div
            className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5"
            aria-hidden
          >
            {urls.map((_, i) => (
              <span
                key={i}
                className="h-1 w-1 rounded-full"
                style={{
                  backgroundColor: i === safeIdx ? lmfitTokens.primary : "rgba(255,255,255,0.65)",
                }}
              />
            ))}
          </div>
        </>
      ) : null}

      {onRemoveIndex ? (
        <button
          type="button"
          aria-label="Remover imagem"
          className="absolute right-0 top-0 z-10 rounded-bl bg-black/55 px-1 py-0.5 text-[10px] leading-none text-white"
          onClick={() => onRemoveIndex(safeIdx)}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
