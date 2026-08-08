import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { prefersReducedMotion, ScrollReveal } from "./ScrollReveal";

// jsdom has no real IntersectionObserver — stub one whose constructor captures the callback so
// tests can fire it manually, simulating the element scrolling into view.
let ioCallback: IntersectionObserverCallback | null = null;
let ioOptions: IntersectionObserverInit | undefined;
const disconnect = vi.fn();
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    ioCallback = cb;
    ioOptions = options;
  }
  observe() {}
  disconnect = disconnect;
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
}

function setReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("prefersReducedMotion", () => {
  it("reflects matchMedia('(prefers-reduced-motion: reduce)')", () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("ScrollReveal — Loop 25", () => {
  beforeEach(() => {
    ioCallback = null;
    ioOptions = undefined;
    disconnect.mockClear();
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    setReducedMotion(false);
  });
  afterEach(cleanup);

  it("AC2: starts hidden (opacity 0, translated) before the element enters the viewport", () => {
    render(
      <ScrollReveal>
        <p data-testid="content">conteúdo</p>
      </ScrollReveal>,
    );
    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.style.opacity).toBe("0");
    expect(wrapper.style.transform).toBe("translateY(16px)");
  });

  it("AC2: reveals (opacity 1, no translate) once IntersectionObserver reports the element is visible", () => {
    render(
      <ScrollReveal>
        <p data-testid="content">conteúdo</p>
      </ScrollReveal>,
    );
    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.style.opacity).toBe("0");

    act(() => {
      ioCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(wrapper.style.opacity).toBe("1");
    expect(wrapper.style.transform).toBe("translateY(0)");
    expect(disconnect).toHaveBeenCalledTimes(1); // fires once, then stops observing
  });

  it("AC3: with prefers-reduced-motion, renders already revealed — no IntersectionObserver even set up", () => {
    setReducedMotion(true);
    render(
      <ScrollReveal>
        <p data-testid="content">conteúdo</p>
      </ScrollReveal>,
    );
    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.style.opacity).toBe("1");
    expect(wrapper.style.transform).toBe("translateY(0)");
    expect(ioCallback).toBeNull(); // IntersectionObserver was never constructed
  });

  it("regression: observes with threshold 0, not 0.15 — a tall wrapped block (e.g. the whole catalog grid) never satisfies a 15%-of-its-own-area threshold within a normal viewport, which permanently froze it at opacity:0", () => {
    render(
      <ScrollReveal>
        <p data-testid="content">conteúdo</p>
      </ScrollReveal>,
    );
    expect(ioOptions?.threshold).toBe(0);
  });

  it("AC4: uses the shared storefront motion CSS vars, not a per-preset animation table", () => {
    render(
      <ScrollReveal>
        <p data-testid="content">conteúdo</p>
      </ScrollReveal>,
    );
    const wrapper = screen.getByTestId("content").parentElement as HTMLElement;
    expect(wrapper.style.transitionDuration).toBe("var(--kivoni-storefront-motion-duration)");
    expect(wrapper.style.transitionTimingFunction).toBe("var(--kivoni-storefront-motion-easing)");
  });
});
