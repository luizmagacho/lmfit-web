import { test, expect } from "@playwright/test";

test("pdv redirects unauthenticated users to login", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto("/pdv", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/login(\?|$)/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/login/);
});
