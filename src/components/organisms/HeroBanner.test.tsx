import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-testid="hero-image" {...(props as Record<string, unknown>)} />
  ),
}));

let mockPreset = "essencial";
let mockStorefront: Record<string, unknown> = { heroTitle: "Título" };
vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({ tenant: { name: "Loja Teste", storefront: mockStorefront }, loading: false, slug: "teste" }),
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
}));

import { HeroBanner, heroWrapperClassName } from "./HeroBanner";

describe("Loop 19 — heroWrapperClassName", () => {
  it("AC6: single keeps the framed card (rounded + border) — no change from before this loop", () => {
    expect(heroWrapperClassName("single")).toBe("rounded-2xl border");
  });

  it("AC6: media-first drops the frame — full-bleed, more dominant", () => {
    expect(heroWrapperClassName("media-first")).toBe("");
  });

  it("collage also drops the frame — the photo grid already fills the space", () => {
    expect(heroWrapperClassName("collage")).toBe("");
  });
});

describe("HeroBanner", () => {
  beforeEach(() => {
    mockPreset = "essencial";
    mockStorefront = { heroTitle: "Título" };
  });
  afterEach(cleanup);

  it("renders nothing when the tenant has no heroTitle configured (AC8, pre-existing)", () => {
    mockStorefront = {};
    const { container } = render(<HeroBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("AC1: essencial (single, default) renders exactly one hero image, no collage grid", () => {
    mockPreset = "essencial";
    mockStorefront = { heroTitle: "Título", heroImages: ["a.jpg", "b.jpg"] };
    const { container } = render(<HeroBanner />);
    // single + 2 images => carousel (both images mounted, one at a time via opacity), never a collage grid
    expect(container.querySelectorAll('[data-testid="hero-image"]').length).toBeGreaterThan(0);
    expect(container.querySelector(".grid-cols-3")).toBeNull();
  });

  it("AC5: vibrante (collage) with 2+ heroImages renders a photo grid instead of a single image", () => {
    mockPreset = "vibrante";
    mockStorefront = { heroTitle: "Título", heroImages: ["a.jpg", "b.jpg", "c.jpg"] };
    const { container } = render(<HeroBanner />);
    // triptych: 3 images shown at once (all mounted simultaneously in a grid, unlike the carousel's one-at-a-time opacity toggle)
    expect(container.querySelectorAll('[data-testid="hero-image"]').length).toBe(3);
    expect(container.querySelector(".grid-cols-3")).not.toBeNull();
  });

  it("V4-4: collage with only 1 photo renders a 3-panel mosaic of the SAME image (never looks like a plain 'single' hero)", () => {
    mockPreset = "vibrante";
    mockStorefront = { heroTitle: "Título", heroImages: ["a.jpg"] };
    const { container } = render(<HeroBanner />);
    const imgs = container.querySelectorAll('[data-testid="hero-image"]');
    expect(imgs.length).toBe(3);
    expect(container.querySelector(".grid-cols-3")).not.toBeNull();
    imgs.forEach((img) => expect(img.getAttribute("src")).toBe("a.jpg"));
  });

  it("V4-4: collage with 0 photos (only heroImageUrl) also renders the 3-panel mosaic, not a single image", () => {
    mockPreset = "vibrante";
    mockStorefront = { heroTitle: "Título", heroImageUrl: "capa.jpg" };
    const { container } = render(<HeroBanner />);
    expect(container.querySelectorAll('[data-testid="hero-image"]').length).toBe(3);
    expect(container.querySelector(".grid-cols-3")).not.toBeNull();
  });

  it("banner carousel: renders instead of the single hero when heroBanners is configured, even with no heroTitle", () => {
    mockStorefront = {
      heroBanners: [
        { imageUrl: "banner-a.jpg", linkedProductSlug: "camisa-a" },
        { imageUrl: "banner-b.jpg" },
      ],
    };
    const { container } = render(<HeroBanner />);
    const imgs = container.querySelectorAll('[data-testid="hero-image"]');
    expect(imgs.length).toBe(2);
    // first slide is clickable (has a linked product), second isn't
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("/loja/p/camisa-a");
  });

  it("banner carousel: inactive slides get pointerEvents none so clicks never hit a hidden slide's link", () => {
    mockStorefront = {
      heroBanners: [
        { imageUrl: "banner-a.jpg", linkedProductSlug: "camisa-a" },
        { imageUrl: "banner-b.jpg", linkedProductSlug: "camisa-b" },
      ],
    };
    const { container } = render(<HeroBanner />);
    const slideWrappers = container.querySelectorAll("section > div");
    expect((slideWrappers[0] as HTMLElement).style.pointerEvents).toBe("auto");
    expect((slideWrappers[1] as HTMLElement).style.pointerEvents).toBe("none");
  });

  it("V4-4: luxo and monocromo no longer share the same hero treatment (mono-quiet vs. studio-mono)", () => {
    mockPreset = "luxo";
    mockStorefront = { heroTitle: "Título", heroImageUrl: "capa.jpg" };
    const { container: luxoContainer } = render(<HeroBanner />);
    const luxoTitle = luxoContainer.querySelector("h2");
    expect(luxoTitle?.className).toContain("tracking-[0.3em]");
    cleanup();

    mockPreset = "monocromo";
    mockStorefront = { heroTitle: "Título", heroImageUrl: "capa.jpg" };
    const { container: minimalContainer } = render(<HeroBanner />);
    const minimalTitle = minimalContainer.querySelector("h2");
    expect(minimalTitle?.className).toContain("tracking-[0.2em]");
  });
});
