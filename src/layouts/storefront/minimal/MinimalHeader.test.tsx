import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ThemePreset } from "@/theme/storefrontPresets";

vi.mock("@/components/organisms/CategoryChips", () => ({
  CategoryChips: () => <nav data-testid="category-chips" />,
}));

let mockPreset: ThemePreset = "monocromo";
vi.mock("@/context/TenantContext", () => ({
  useThemePreset: () => mockPreset,
}));

import { MinimalHeader } from "./MinimalHeader";
import type { FamilyHeaderProps } from "../types";

const baseProps: FamilyHeaderProps = {
  tenant: null,
  homeHref: "/loja",
  searchDraft: "",
  setSearchDraft: vi.fn(),
  submitSearch: vi.fn((e) => e.preventDefault()),
};

describe("MinimalHeader — Loop V4-1 (Luxo/Wellness/Minimal each get their own nav treatment)", () => {
  beforeEach(() => {
    mockPreset = "monocromo";
  });
  afterEach(cleanup);

  it("AC: luxo has no CategoryChips/text nav, and search starts collapsed to an icon", () => {
    mockPreset = "luxo";
    render(<MinimalHeader {...baseProps} />);
    expect(screen.queryByTestId("category-chips")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("button", { name: "Buscar produto" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("AC: clicking luxo's search icon reveals the input", () => {
    mockPreset = "luxo";
    render(<MinimalHeader {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));
    expect(screen.getByRole("searchbox")).toBeDefined();
  });

  it("AC: studio (Wellness) renders CategoryChips as a nav row", () => {
    mockPreset = "studio";
    render(<MinimalHeader {...baseProps} />);
    expect(screen.getByTestId("category-chips")).toBeDefined();
  });

  it("AC: monocromo (Minimal/COS) renders a plain text nav, no CategoryChips", () => {
    mockPreset = "monocromo";
    render(<MinimalHeader {...baseProps} />);
    expect(screen.queryByTestId("category-chips")).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Navegação" });
    expect(nav.textContent).toContain("Loja");
    expect(nav.textContent).toContain("Quem somos");
    expect(nav.textContent).toContain("Contato");
  });
});
