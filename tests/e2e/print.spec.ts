import { test, expect } from "@playwright/test";

test.describe("Order Custom Print E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock API requests
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-123",
          email: "admin@lmfit.local",
          name: "Administrador LMFIT",
          role: "admin",
        }),
      });
    });

    await page.route("**/orders/order-123", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          _id: "order-123",
          number: 162,
          customerId: "cust-456",
          channel: "online",
          status: "paid",
          total: 118,
          createdAt: "2026-05-20T10:33:00.000Z",
          lines: [
            {
              variantId: "var-1",
              quantity: 2,
              unitPrice: 59,
              description: "Bermuda Helo (GG, Militar)",
            },
          ],
        }),
      });
    });

    await page.route("**/customers/cust-456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
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
        }),
      });
    });

    await page.route("**/products**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: "prod-1",
              name: "Bermuda Helo",
              variants: [
                {
                  id: "var-1",
                  sku: "BERM-HELO-1",
                  price: 59,
                  color: "Militar",
                  size: "GG",
                },
              ],
            },
          ],
        }),
      });
    });

    // 2. Inject localStorage tokens for Requirement Auth bypassing and print stubbing
    await page.addInitScript(() => {
      try {
        localStorage.setItem("lmfit_access_token", "fake-token");
        localStorage.setItem("lmfit_refresh_token", "fake-token");
      } catch {
        /* ignore */
      }

      // Stub window.print to track call without opening native modal
      (window as any).__printCalled = false;
      window.print = () => {
        (window as any).__printCalled = true;
      };
    });
  });

  test("loads printing customizer page and toggles options", async ({ page }) => {
    // Navigate to the dynamic print page
    await page.goto("/orders/order-123/print", { waitUntil: "domcontentloaded" });

    // Assert customizer titles are visible
    await expect(page.getByRole("heading", { name: "Imprimir resumo do pedido" })).toBeVisible({ timeout: 20_000 });
    
    // Assert visual preview has correct content loaded
    await expect(page.getByText("#162").first()).toBeVisible();
    await expect(page.getByText("Cristiane Atacado")).toBeVisible();
    await expect(page.getByText("Bermuda Helo (GG, Militar)")).toBeVisible();
    await expect(page.getByText("BERM-HELO-1")).toBeVisible();

    // Verify option checklist checkbox is checked initially
    const checklistLabel = page.locator("label:has-text('Checklist para separação')");
    const checklistCheckbox = checklistLabel.locator("input[type='checkbox']");
    await expect(checklistCheckbox).toBeChecked();

    // Toggle checklist checkbox
    await checklistCheckbox.click();
    await expect(checklistCheckbox).not.toBeChecked();

    // Click on the print button
    const printBtn = page.getByRole("button", { name: "Imprimir Resumo" });
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // Assert that the print method was triggered
    const printTriggered = await page.evaluate(() => (window as any).__printCalled);
    expect(printTriggered).toBe(true);
  });
});
