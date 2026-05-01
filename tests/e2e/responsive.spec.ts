import { test, expect } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

for (const vp of viewports) {
  test(`login layout ${vp.name} (${vp.width})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test(`public catalog ${vp.name} (${vp.width})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Catálogo LM FIT" }),
    ).toBeVisible({ timeout: 30_000 });
  });
}
