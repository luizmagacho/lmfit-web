import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge — Loop 20 sticker prop", () => {
  afterEach(cleanup);

  it("AC2: renders as a plain pill by default (sticker false) — no rotation/shadow", () => {
    render(<Badge variant="lancamento">Lançamento</Badge>);
    const badge = screen.getByText("Lançamento");
    expect(badge.className).not.toContain("rotate");
    expect(badge.className).not.toContain("shadow-md");
  });

  it("AC1: sticker=true adds rotation + shadow — the 'peel-off sticker' look", () => {
    render(
      <Badge variant="lancamento" sticker>
        É novidade!
      </Badge>,
    );
    const badge = screen.getByText("É novidade!");
    expect(badge.className).toContain("rotate-[-6deg]");
    expect(badge.className).toContain("shadow-md");
  });
});
