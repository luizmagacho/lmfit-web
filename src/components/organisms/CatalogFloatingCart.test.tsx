import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// QuickCart pulls in IconButton, which relies on the automatic JSX runtime — not configured in
// this project's vitest setup (only components that explicitly `import * as React` survive
// vitest's classic-transform default). Stubbed here since this test is only about the WhatsApp
// handoff timing, not QuickCart's own rendering.
vi.mock("@/components/organisms/QuickCart", () => ({
  QuickCart: ({ onFinalize, finalizeLabel, busy }: { onFinalize: () => void; finalizeLabel?: string; busy?: boolean }) => (
    <button onClick={onFinalize} disabled={busy}>
      {busy ? "Enviando…" : finalizeLabel}
    </button>
  ),
}));

vi.mock("@/lib/publicHttp", () => ({
  publicHttp: {
    post: vi.fn((url: string) => {
      if (url === "/public/order-drafts") return Promise.resolve({ data: { sessionToken: "tok-1" } });
      if (url.endsWith("/submit")) return Promise.resolve({ data: { orderId: "ORD-1" } });
      return Promise.resolve({ data: {} });
    }),
    patch: vi.fn().mockResolvedValue({ data: { discountTotal: 0 } }),
  },
}));

import { useCartStore } from "@/stores/useCartStore";
import { CatalogFloatingCart } from "./CatalogFloatingCart";

const cartLine = {
  variantId: "v1",
  productId: "p1",
  productName: "Camiseta Dry Fit",
  sku: "CAM-P-M",
  quantity: 2,
  priceRetail: 50,
  priceWholesale: null,
  minWholesaleQty: 1,
  unitPrice: 50,
  mode: "varejo" as const,
};

describe("CatalogFloatingCart — WhatsApp handoff on iOS Safari", () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [cartLine], customer: null });
  });

  afterEach(() => {
    cleanup();
    useCartStore.setState({ lines: [], customer: null });
    vi.restoreAllMocks();
  });

  it("opens the tab synchronously on click, before any await resolves — window.open() after an await is silently blocked by iOS Safari's popup blocker", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn() } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    render(<CatalogFloatingCart />);

    fireEvent.click(screen.getByText("Comprar via WhatsApp"));
    fireEvent.change(screen.getByPlaceholderText("Seu Nome Completo"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("Seu WhatsApp (DDD + Número)"), { target: { value: "41999998888" } });

    fireEvent.click(screen.getByText("Confirmar e Enviar"));

    // Called immediately (synchronously, in the same tick as the click) with a blank tab —
    // never with the wa.me URL directly, which would arrive only after 3 awaited requests.
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(openSpy).not.toHaveBeenCalledWith(expect.stringContaining("wa.me"), expect.anything());

    await waitFor(() => expect(fakeWindow.location.href).toContain("https://wa.me/"));
    expect(fakeWindow.location.href).toContain("ORD-1");
    expect(openSpy).toHaveBeenCalledTimes(1); // never opened a second (blockable) window
  });

  it("closes the pre-opened blank tab if the order submission fails", async () => {
    const { publicHttp } = await import("@/lib/publicHttp");
    (publicHttp.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network down"));

    const fakeWindow = { location: { href: "" }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    render(<CatalogFloatingCart />);
    fireEvent.click(screen.getByText("Comprar via WhatsApp"));
    fireEvent.change(screen.getByPlaceholderText("Seu Nome Completo"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("Seu WhatsApp (DDD + Número)"), { target: { value: "41999998888" } });
    fireEvent.click(screen.getByText("Confirmar e Enviar"));

    await waitFor(() => expect(fakeWindow.close).toHaveBeenCalled());
  });
});
