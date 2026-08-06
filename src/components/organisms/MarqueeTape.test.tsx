import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarqueeTape } from "./MarqueeTape";

describe("MarqueeTape — Loop 21 diagonal variant", () => {
  afterEach(cleanup);

  it("AC4: no variant prop (default) renders exactly the historical horizontal marquee — regression zero for the existing IndustrialHome caller", () => {
    const { container } = render(<MarqueeTape text="KIVONI OFFICIAL STORE" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("overflow-hidden");
    expect(wrapper.className).toContain("border-y-2");
    expect(wrapper.className).not.toContain("rotate-45");
    // 2 copies × 10 repeats = 20 text instances, the existing marquee-loop structure.
    expect(screen.getAllByText(/KIVONI OFFICIAL STORE/).length).toBe(20);
  });

  it("explicit variant='horizontal' behaves identically to the default", () => {
    const { container } = render(<MarqueeTape text="X" variant="horizontal" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("border-y-2");
  });

  it("AC5: variant='diagonal' renders a rotated corner ribbon, not the horizontal bar", () => {
    const { container } = render(<MarqueeTape text="ORIGINAL" variant="diagonal" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("rotate-45");
    expect(wrapper.className).not.toContain("border-y-2");
    // Only one instance of the text — a ribbon, not a repeating marquee loop.
    expect(screen.getAllByText("ORIGINAL").length).toBe(1);
  });
});
