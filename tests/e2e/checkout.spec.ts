import { test, expect } from "@playwright/test";

test("checkout public page renders for empty cart", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Finalizar pedido" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/carrinho está vazio/i)).toBeVisible();
});

test("public catalog page renders", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto("/catalogo", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Catálogo/i })).toBeVisible({ timeout: 30_000 });
});
