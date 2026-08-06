import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SectionCard } from "./SectionCard";

describe("SectionCard (Loop 19 — sectionTexture wrapper)", () => {
  afterEach(cleanup);

  it("AC1 regression floor: 'none' mounts no wrapper at all — children render as-is", () => {
    const { container } = render(
      <SectionCard texture="none">
        <p data-testid="child">conteúdo</p>
      </SectionCard>,
    );
    // No extra wrapping div — the child is the only element under the render root.
    expect(container.children).toHaveLength(1);
    expect(container.firstChild).toBe(screen.getByTestId("child"));
  });

  it("color-card wraps children in a rounded colored-surface card", () => {
    const { container } = render(
      <SectionCard texture="color-card">
        <p>conteúdo</p>
      </SectionCard>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("rounded-3xl");
    expect(wrapper.style.backgroundColor).toBeTruthy();
  });

  it("hard-frame wraps children in a hard black 2px border", () => {
    const { container } = render(
      <SectionCard texture="hard-frame">
        <p>conteúdo</p>
      </SectionCard>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    // jsdom normalizes hex to rgb() in computed inline style.
    expect(wrapper.style.border).toBe("2px solid rgb(0, 0, 0)");
  });

  it("AC7: grain adds a background-image noise layer behind the content, never on top of it", () => {
    render(
      <SectionCard texture="grain">
        <p data-testid="child">conteúdo</p>
      </SectionCard>,
    );
    const grain = screen.getByTestId("section-grain");
    expect(grain.getAttribute("aria-hidden")).not.toBeNull();
    expect(grain.className).toContain("z-0");
    expect(grain.style.backgroundImage).toContain("data:image/svg+xml");
    // The child sits in its own z-10 layer, above the grain (z-0) — never visually obscured.
    const child = screen.getByTestId("child");
    expect(child.parentElement?.className).toContain("z-10");
  });
});
