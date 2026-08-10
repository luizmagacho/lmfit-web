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

// Regression: the wa.me destination used to be a literal string hardcoded in this component,
// disconnected from the store's actual configured number (and from /loja's checkout, which
// already read tenant.whatsappNumber) — mock the tenant to a real number by default so the
// happy-path tests below exercise the same code path production uses.
let mockTenant: { whatsappNumber?: string } | null = { whatsappNumber: "5541999998888" };
vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({ tenant: mockTenant }),
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
    mockTenant = { whatsappNumber: "5541999998888" };
  });

  afterEach(() => {
    cleanup();
    useCartStore.setState({ lines: [], customer: null });
    // restoreAllMocks() calls mockRestore() on every mock, including the plain vi.fn()s
    // returned by the vi.mock() factories above — for those (no real implementation to
    // "restore" to) that wipes the factory's own mockImplementation, so every test after the
    // first silently got `post()` resolving to undefined. clearAllMocks() only resets call
    // history, which is all a per-test spy like `vi.spyOn(window, "open")` actually needs.
    vi.clearAllMocks();
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

  it("shows a real tappable <a href> to wa.me once the order succeeds — the guaranteed path when the pre-opened tab was silently closed (iOS Safari)", async () => {
    const fakeWindow = { location: { href: "" }, close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    render(<CatalogFloatingCart />);
    fireEvent.click(screen.getByText("Comprar via WhatsApp"));
    fireEvent.change(screen.getByPlaceholderText("Seu Nome Completo"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("Seu WhatsApp (DDD + Número)"), { target: { value: "41999998888" } });
    fireEvent.click(screen.getByText("Confirmar e Enviar"));

    const link = await screen.findByText("Abrir WhatsApp");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toContain("https://wa.me/");
    expect(link.getAttribute("href")).toContain("ORD-1");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("keeps the confirmation link visible after clearCart empties the bag — items===0 alone must not unmount it", async () => {
    vi.spyOn(window, "open").mockReturnValue({ location: { href: "" }, close: vi.fn() } as unknown as Window);

    render(<CatalogFloatingCart />);
    fireEvent.click(screen.getByText("Comprar via WhatsApp"));
    fireEvent.change(screen.getByPlaceholderText("Seu Nome Completo"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("Seu WhatsApp (DDD + Número)"), { target: { value: "41999998888" } });
    fireEvent.click(screen.getByText("Confirmar e Enviar"));

    await screen.findByText("Abrir WhatsApp");
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(screen.getByText("Abrir WhatsApp")).toBeDefined();
  });

  it("blocks the order entirely — never opens a tab, never submits — when the store has no whatsappNumber configured", async () => {
    mockTenant = { whatsappNumber: undefined };
    const { publicHttp } = await import("@/lib/publicHttp");
    const openSpy = vi.spyOn(window, "open");

    render(<CatalogFloatingCart />);
    fireEvent.click(screen.getByText("Comprar via WhatsApp"));
    fireEvent.change(screen.getByPlaceholderText("Seu Nome Completo"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("Seu WhatsApp (DDD + Número)"), { target: { value: "41999998888" } });
    fireEvent.click(screen.getByText("Confirmar e Enviar"));

    // Checked before creating anything server-side — a misconfigured store must not leave an
    // "orphan" submitted order the customer has no way to follow up on via WhatsApp.
    expect(publicHttp.post).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("Abrir WhatsApp")).toBeNull();
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
