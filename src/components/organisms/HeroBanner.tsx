"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTenant, useThemeTokens } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import type { HeroComposition, HeroTreatment } from "@/theme/storefrontPresets";

const CAROUSEL_INTERVAL_MS = 5000;

/** Loop 4d — cada tratamento é só uma combinação diferente de overlay/posição/tipografia sobre a
 *  mesma imagem; nenhum precisa de mídia nova (benchmark STOREFRONT-V2.md §2.10). */
const HERO_TREATMENT_STYLES: Record<
  HeroTreatment,
  {
    overlayClassName: string;
    contentClassName: string;
    titleClassName: string;
    imageFilter?: string;
  }
> = {
  "calm-caption": {
    overlayClassName: "bg-black/35 justify-center",
    contentClassName: "px-6",
    titleClassName: "font-bold",
  },
  "full-bleed-overlay": {
    overlayClassName: "bg-gradient-to-t from-black/70 via-black/20 to-transparent justify-end",
    contentClassName: "px-8 pb-8 text-center items-center",
    titleClassName: "font-normal tracking-wide",
  },
  "action-frame": {
    overlayClassName: "bg-gradient-to-r from-black/75 via-black/30 to-transparent justify-center",
    contentClassName: "px-8",
    titleClassName: "font-black uppercase tracking-tight",
  },
  "still-life": {
    overlayClassName: "bg-black/10 justify-center",
    contentClassName: "px-10 text-center items-center",
    titleClassName: "font-medium uppercase tracking-[0.15em] text-base",
  },
  "color-block": {
    overlayClassName: "bg-gradient-to-t from-black/60 via-transparent to-transparent justify-end",
    contentClassName: "px-6 pb-6",
    titleClassName: "font-extrabold",
  },
  "wellness-soft": {
    overlayClassName: "bg-black/20 justify-end",
    contentClassName: "px-6 pb-6",
    titleClassName: "font-medium",
  },
  "impact-bold": {
    overlayClassName: "bg-gradient-to-b from-black/70 to-black/10 justify-start",
    contentClassName: "px-6 pt-6",
    titleClassName: "font-black uppercase text-2xl italic",
  },
  "studio-mono": {
    overlayClassName: "bg-black/45 justify-end",
    contentClassName: "px-6 pb-5 text-right items-end",
    titleClassName: "font-light uppercase tracking-[0.2em] text-sm",
    imageFilter: "grayscale(1)",
  },
  /** Loop V4-4 — próprio de Luxo (Calvin Klein), separado de "studio-mono" (Minimal/COS) que
   *  compartilhava o mesmo tratamento apesar de referências opostas. Overlay bem mais claro (a
   *  foto manda, menos "filtro"), legenda no canto inferior-ESQUERDO (studio-mono é direito) com
   *  tracking ainda mais largo — "wide-tracking caption" levado ao literal. */
  "mono-quiet": {
    overlayClassName: "bg-black/20 justify-end",
    contentClassName: "px-8 pb-6 text-left items-start",
    titleClassName: "font-light uppercase tracking-[0.3em] text-xs",
    imageFilter: "grayscale(1)",
  },
};

/** Loop 19 — estrutura do wrapper por `heroComposition`, ORTOGONAL ao `heroTreatment` (que
 *  continua sendo só a pele — overlay/tipografia). "single" é o cartão contido de sempre (cantos
 *  arredondados + borda); "media-first"/"collage" tiram a moldura pra o hero tomar a largura toda,
 *  mais dominante (uma grade de fotos já preenche o espaço sozinha, então a moldura contida faria
 *  menos sentido ali também). */
export function heroWrapperClassName(composition: HeroComposition): string {
  if (composition === "single") return "rounded-2xl border";
  return "";
}

function HeroImage({
  src,
  alt,
  filter,
  priority,
}: {
  src: string;
  alt: string;
  filter?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(min-width: 768px) 768px, 100vw"
      className="object-cover"
      style={filter ? { filter } : undefined}
    />
  );
}

/** Carrossel simples (autoplay + dots) — só entra em cena quando o tenant configurou 2+ imagens;
 *  com 0-1 imagem, `HeroBanner` nunca monta este componente (mantém o comportamento de sempre). */
function HeroCarousel({ images, filter }: { images: string[]; filter?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <>
      {images.map((src, i) => (
        <div
          key={src + i}
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: "var(--kivoni-storefront-motion-duration)",
          }}
          aria-hidden={i !== index}
        >
          <HeroImage src={src} alt="" filter={filter} priority={i === 0} />
        </div>
      ))}
      <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para imagem ${i + 1}`}
            onClick={() => setIndex(i)}
            className="w-1.5 h-1.5 rounded-full transition-opacity"
            style={{ backgroundColor: "#fff", opacity: i === index ? 1 : 0.4 }}
          />
        ))}
      </div>
    </>
  );
}

/** Loop 19 — grade de fotos em vez de uma imagem só, pra `heroComposition: "collage"` (Tropical).
 *  Reaproveita o mesmo `heroImages` que já alimenta o carrossel — sem campo novo no tenant. Com
 *  3+ fotos vira um tríptico (1 foto grande + 2 pequenas empilhadas); com exatamente 2, vira uma
 *  divisão simples lado a lado. `HeroBanner` só monta este componente quando há 2+ imagens —
 *  com 0-1 foto, cai no mesmo fallback de imagem única que "single"/"media-first" já usam. */
function HeroCollage({ images, filter }: { images: string[]; filter?: string }) {
  const shown = images.slice(0, 3);
  const isTriptych = shown.length >= 3;
  return (
    <div className={`grid gap-1 h-full ${isTriptych ? "grid-cols-3 grid-rows-2" : "grid-cols-2"}`}>
      {shown.map((src, i) => (
        <div key={src + i} className={`relative ${isTriptych && i === 0 ? "col-span-2 row-span-2" : ""}`}>
          <HeroImage src={src} alt="" filter={filter} priority={i === 0} />
        </div>
      ))}
    </div>
  );
}

/** Loop V4-4 — quando o tenant configurou `heroComposition: "collage"` (Tropical) mas só tem 0-1
 *  `heroImages`, a versão anterior caía no mesmo fallback de imagem única que "single" usa —
 *  ficando indistinguível dos 7 outros presets que também usam esse visual. Em vez disso, monta a
 *  MESMA grade de `HeroCollage` (tríptico), com os 3 painéis apontando pra a mesma foto em
 *  `object-position` diferentes — simula 3 crops sem exigir foto nova do tenant. */
function HeroCollageFallback({ src, alt, filter }: { src: string; alt: string; filter?: string }) {
  const crops = ["20% 30%", "80% 20%", "50% 90%"];
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-1 h-full">
      {crops.map((position, i) => (
        <div key={i} className={`relative ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
          <Image
            src={src}
            alt={i === 0 ? alt : ""}
            fill
            priority={i === 0}
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
            style={{ objectPosition: position, ...(filter ? { filter } : {}) }}
          />
        </div>
      ))}
    </div>
  );
}

/** Torna um elemento clicável quando há um produto linkado — sem link, continua um `<div>`
 *  normal. Reaproveitado tanto pelo hero clássico quanto pelo `HeroBannerCarousel` abaixo. */
function HeroClickWrapper({
  href,
  className,
  style,
  children,
}: {
  href?: string;
  className: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

/** Carrossel de banners promocionais — menor e retangular (proporção fixa, diferente do hero
 *  estilizado por preset abaixo), cada slide com link próprio pra um produto do catálogo e
 *  título/subtítulo/CTA próprios, todos opcionais — a imagem sozinha já basta se a arte já
 *  carrega a mensagem. Quando o tenant configura `heroBanners`, `HeroBanner()` renderiza ISSO em
 *  vez do hero de título único — os dois modos não empilham. Slides inativos ganham
 *  `pointerEvents: "none"` (não só opacity 0) pra um clique nunca acertar o link de um slide
 *  escondido atrás do ativo. */
const BANNER_CAROUSEL_ASPECT_RATIO = "3 / 1";

interface HeroBannerSlideData {
  imageUrl: string;
  linkedProductSlug?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
}

function HeroBannerCarousel({ slides }: { slides: HeroBannerSlideData[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative overflow-hidden rounded-xl" style={{ aspectRatio: BANNER_CAROUSEL_ASPECT_RATIO }}>
      {slides.map((slide, i) => (
        <div
          key={slide.imageUrl + i}
          className="absolute inset-0 transition-opacity"
          style={{
            opacity: i === index ? 1 : 0,
            pointerEvents: i === index ? "auto" : "none",
            transitionDuration: "var(--kivoni-storefront-motion-duration)",
          }}
          aria-hidden={i !== index}
        >
          <HeroClickWrapper
            href={slide.linkedProductSlug ? `/loja/p/${slide.linkedProductSlug}` : undefined}
            className="absolute inset-0"
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title ?? ""}
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
            />
            {slide.title || slide.subtitle || slide.ctaLabel ? (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 to-transparent px-4 py-3 sm:px-6 sm:py-4">
                {slide.title ? (
                  <h2 className="text-white font-bold leading-tight" style={{ fontFamily: lmfitTokens.fontDisplay, fontSize: "clamp(0.95rem, 3vw, 1.5rem)" }}>
                    {slide.title}
                  </h2>
                ) : null}
                {slide.subtitle ? <p className="text-white/90 text-xs sm:text-sm mt-0.5">{slide.subtitle}</p> : null}
                {slide.ctaLabel ? (
                  <span
                    className="inline-block mt-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md w-fit"
                    style={{ backgroundColor: lmfitTokens.primary, color: "white" }}
                  >
                    {slide.ctaLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </HeroClickWrapper>
        </div>
      ))}
      {slides.length > 1 ? (
        <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className="w-1.5 h-1.5 rounded-full transition-opacity"
              style={{ backgroundColor: "#fff", opacity: i === index ? 1 : 0.4 }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Banner editorial no topo do catálogo (Loop 4 continuação) — só aparece quando o tenant
 *  configurou pelo menos um título; sem isso, não renderiza nada (AC8). Loop 4d: tratamento de
 *  overlay/tipografia por preset + carrossel automático quando `heroImages` tem 2+ fotos. */
export function HeroBanner() {
  const { tenant } = useTenant();
  const { heroTreatment, heroAspectRatio, heroComposition } = useThemeTokens();
  const sf = tenant?.storefront;

  const banners = (sf?.heroBanners ?? []).filter((b) => b.imageUrl);
  if (banners.length > 0) return <HeroBannerCarousel slides={banners} />;

  if (!sf?.heroTitle) return null;

  const images = (sf.heroImages ?? []).filter(Boolean);
  const isCollage = heroComposition === "collage";
  const hasMultipleImages = images.length > 1;
  const isCarousel = !isCollage && hasMultipleImages;
  const singleImage = images[0] ?? sf.heroImageUrl;
  const treatment = HERO_TREATMENT_STYLES[heroTreatment];
  const wrapperClassName = heroWrapperClassName(heroComposition);
  const isFramed = heroComposition === "single";

  return (
    <section
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={isFramed ? { borderColor: lmfitTokens.border } : undefined}
    >
      {singleImage ? (
        <div className="relative w-full" style={{ aspectRatio: heroAspectRatio }}>
          {isCollage && hasMultipleImages ? (
            <HeroCollage images={images} filter={treatment.imageFilter} />
          ) : isCollage ? (
            <HeroCollageFallback src={singleImage} alt={sf.heroTitle} filter={treatment.imageFilter} />
          ) : isCarousel ? (
            <HeroCarousel images={images} filter={treatment.imageFilter} />
          ) : (
            <HeroImage src={singleImage} alt={sf.heroTitle} filter={treatment.imageFilter} priority />
          )}
          <div className={`absolute inset-0 flex flex-col ${treatment.overlayClassName}`}>
            <div className={`flex flex-col ${treatment.contentClassName}`}>
              <h2
                className={`text-white ${treatment.titleClassName}`}
                style={{ fontFamily: lmfitTokens.fontDisplay, fontSize: "clamp(1.25rem, 4vw, 2rem)" }}
              >
                {sf.heroTitle}
              </h2>
              {sf.heroSubtitle ? <p className="text-white/90 text-sm mt-1 max-w-md">{sf.heroSubtitle}</p> : null}
              {sf.heroCtaLabel ? (
                <span
                  className="inline-block mt-3 px-4 py-2 text-sm font-semibold rounded-md w-fit"
                  style={{ backgroundColor: lmfitTokens.primary, color: "white" }}
                >
                  {sf.heroCtaLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-10" style={{ backgroundColor: "var(--kivoni-surface)" }}>
          <h2 className="font-bold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay, fontSize: "clamp(1.25rem, 4vw, 2rem)" }}>
            {sf.heroTitle}
          </h2>
          {sf.heroSubtitle ? (
            <p className="text-sm mt-1 max-w-md" style={{ color: lmfitTokens.textMuted }}>
              {sf.heroSubtitle}
            </p>
          ) : null}
          {sf.heroCtaLabel ? (
            <span
              className="inline-block mt-3 px-4 py-2 text-sm font-semibold rounded-md"
              style={{ backgroundColor: lmfitTokens.primary, color: "white" }}
            >
              {sf.heroCtaLabel}
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}
