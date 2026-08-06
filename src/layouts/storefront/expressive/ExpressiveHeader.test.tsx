import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/organisms/CategoryChips", () => ({
  CategoryChips: () => <nav data-testid="category-chips" />,
}));

import { ExpressiveHeader } from "./ExpressiveHeader";
import type { FamilyHeaderProps } from "../types";

const baseProps: FamilyHeaderProps = {
  tenant: null,
  homeHref: "/loja",
  searchDraft: "",
  setSearchDraft: vi.fn(),
  submitSearch: vi.fn((e) => e.preventDefault()),
};

describe("ExpressiveHeader — Loop V4-1 (Tropical gains a real nav row)", () => {
  afterEach(cleanup);

  it("AC: renders CategoryChips as a second row below the colored band", () => {
    render(<ExpressiveHeader {...baseProps} />);
    expect(screen.getByTestId("category-chips")).toBeDefined();
  });

  it("AC: keeps the existing logo/search/account row unchanged", () => {
    render(<ExpressiveHeader {...baseProps} />);
    expect(screen.getByRole("searchbox", { name: "Buscar produto" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Minha conta" })).toBeDefined();
  });
});
