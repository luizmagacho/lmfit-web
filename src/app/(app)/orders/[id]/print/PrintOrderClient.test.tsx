import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PrintOrderClient } from "./PrintOrderClient";
import * as React from "react";

// Mock next/link to render a plain <a> tag
vi.mock("next/link", () => {
  return {
    default: ({ children, href, ...props }: any) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
});

// Mock next/image to render a plain <img> tag
vi.mock("next/image", () => {
  return {
    default: ({ src, alt, ...props }: any) => {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} {...props} />;
    },
  };
});

// Mock api methods
vi.mock("@/lib/orders/ordersApi", () => ({
  getOrder: vi.fn(),
}));

vi.mock("@/lib/crm/customer360", () => ({
  fetchCustomerById: vi.fn(),
}));

vi.mock("@/lib/http", () => ({
  http: {
    get: vi.fn(),
  },
}));

import { getOrder } from "@/lib/orders/ordersApi";
import { fetchCustomerById } from "@/lib/crm/customer360";
import { http } from "@/lib/http";

describe("PrintOrderClient", () => {
  const mockOrder = {
    _id: "order-123",
    number: 162,
    customerId: "cust-456",
    channel: "online",
    status: "paid",
    total: 118,
    createdAt: "2026-05-20T10:33:00.000Z",
    lines: [
      { variantId: "var-1", quantity: 2, unitPrice: 59, description: "Bermuda Helo (GG, Militar)" },
    ],
  };

  const mockCustomer = {
    _id: "cust-456",
    name: "Cristiane Atacado",
    phone: "11999990001",
    email: "cris@atacado.local",
    logradouro: "Rua Barão de Cotegipe",
    numero: "10",
    bairro: "São Sebastião",
    cidade: "Santa Rita do Passa Quatro",
    uf: "SP",
    cep: "13670001",
  };

  const mockProductsResponse = {
    data: {
      items: [
        {
          id: "prod-1",
          name: "Bermuda Helo",
          variants: [
            { id: "var-1", sku: "BERM-HELO-1", price: 59, color: "Militar", size: "GG" },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup standard mock returns
    vi.mocked(getOrder).mockResolvedValue(mockOrder);
    vi.mocked(fetchCustomerById).mockResolvedValue(mockCustomer);
    vi.mocked(http.get).mockResolvedValue(mockProductsResponse);
    
    // Mock window.print
    vi.stubGlobal("print", vi.fn());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders order preview successfully after fetching details", async () => {
    render(<PrintOrderClient orderId="order-123" />);

    // Renders loader first
    expect(screen.getByText(/Carregando/i)).toBeDefined();

    // Renders visualizer panel and content
    await waitFor(() => {
      expect(document.body.textContent).toContain("162");
    });

    expect(document.body.textContent).toContain("Cristiane Atacado");
    expect(document.body.textContent).toContain("Bermuda Helo (GG, Militar)");
    expect(document.body.textContent).toContain("BERM-HELO-1");
    expect(document.body.textContent).toContain("118");
  });

  it("toggles checklist visibility in preview", async () => {
    render(<PrintOrderClient orderId="order-123" />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("162");
    });

    const checklistCheckbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
    expect(checklistCheckbox.checked).toBe(true);

    // Toggle checklist off
    fireEvent.click(checklistCheckbox);
    expect(checklistCheckbox.checked).toBe(false);
  });

  it("triggers window.print when print button is clicked", async () => {
    render(<PrintOrderClient orderId="order-123" />);

    await waitFor(() => {
      expect(document.body.textContent).toContain("162");
    });

    const printButton = screen.getByRole("button", { name: /Imprimir Resumo/i });
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
