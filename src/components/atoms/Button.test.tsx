import { describe, expect, it } from "vitest";
import { resolveButtonVisualStyle } from "./Button";

describe("resolveButtonVisualStyle (Loop 4c)", () => {
  it("solid variant fills the background with the primary color", () => {
    const style = resolveButtonVisualStyle("solid");
    expect(style.backgroundColor).toBe("var(--kivoni-primary)");
    expect(style.color).toBe("#fff");
  });

  it("ghost variant is transparent with a colored border/text", () => {
    const style = resolveButtonVisualStyle("ghost");
    expect(style.backgroundColor).toBe("transparent");
    expect(style.color).toBe("var(--kivoni-primary)");
  });

  it("pill variant always uses a 999px radius regardless of the radius override", () => {
    const style = resolveButtonVisualStyle("pill", 0);
    expect(style.borderRadius).toBe("999px");
  });

  it("solid/ghost use the radius override when provided (Settings picker mockup)", () => {
    const style = resolveButtonVisualStyle("ghost", 20);
    expect(style.borderRadius).toBe(20);
  });

  it("falls back to the --kivoni-radius CSS var when no radius override is given", () => {
    const style = resolveButtonVisualStyle("solid");
    expect(style.borderRadius).toBe("var(--kivoni-radius)");
  });

  it("uses the color override for solid (Settings preview — live unsaved primaryColor)", () => {
    const style = resolveButtonVisualStyle("solid", undefined, "#ff0000");
    expect(style.backgroundColor).toBe("#ff0000");
    expect(style.borderColor).toBe("#ff0000");
  });

  it("uses the color override for ghost text/border", () => {
    const style = resolveButtonVisualStyle("ghost", undefined, "#ff0000");
    expect(style.color).toBe("#ff0000");
    expect(style.borderColor).toBe("#ff0000");
  });

  it("falls back to --kivoni-primary when no color override is given", () => {
    const style = resolveButtonVisualStyle("solid");
    expect(style.backgroundColor).toBe("var(--kivoni-primary)");
  });
});
