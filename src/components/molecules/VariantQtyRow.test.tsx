import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VariantQtyRow, type VariantRowData } from "./VariantQtyRow";

const baseRow: VariantRowData = {
  variantId: "v1",
  sku: "CNJNFLW-AB-G",
  color: "Azul Bic",
  size: "G",
  unitPrice: 70,
  stock: 0,
  acceptsBackorder: false,
};

describe("VariantQtyRow — Encomendar only for variants that actually accept backorder", () => {
  afterEach(cleanup);

  // Regression: the catalog PDP showed "Encomendar" for every out-of-stock variant regardless
  // of its own acceptsBackorder flag — adding it to cart always succeeded, but the checkout
  // step (which validates per-variant) rejected it with "Estoque insuficiente", so the
  // customer's WhatsApp order looked like it silently failed.
  it("shows a disabled/non-actionable state, not 'Encomendar', when the variant does not accept backorder", () => {
    const onChange = vi.fn();
    render(
      <VariantQtyRow data={baseRow} quantity={0} focused={false} onChange={onChange} onFocus={vi.fn()} />,
    );
    expect(screen.queryByText("Encomendar")).toBeNull();
    expect(screen.getByText("Indisponível")).toBeDefined();
  });

  it("shows 'Encomendar' and lets the customer add it to cart when the variant does accept backorder", () => {
    const onChange = vi.fn();
    render(
      <VariantQtyRow
        data={{ ...baseRow, acceptsBackorder: true }}
        quantity={0}
        focused={false}
        onChange={onChange}
        onFocus={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Encomendar"));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("shows the normal quantity stepper (not Encomendar/Indisponível) once the item is in stock", () => {
    render(
      <VariantQtyRow
        data={{ ...baseRow, stock: 5 }}
        quantity={0}
        focused={false}
        onChange={vi.fn()}
        onFocus={vi.fn()}
      />,
    );
    expect(screen.queryByText("Encomendar")).toBeNull();
    expect(screen.queryByText("Indisponível")).toBeNull();
    expect(screen.getByLabelText("Quantidade CNJNFLW-AB-G")).toBeDefined();
  });
});
