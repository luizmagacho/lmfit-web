import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({
    timeout: 30_000,
  });
});
