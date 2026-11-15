import { expect, test } from "@playwright/test";

test("renders the complete Help Center and dismisses Fox AI", async ({ page }) => {
  await page.goto("/help");

  await expect(page.getByRole("heading", { name: "How can we help?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^General/ })).toBeVisible();
  await expect(page.getByText("14 answers")).toBeVisible();

  await page.getByRole("button", { name: "Open Fox AI support" }).click();
  await expect(page.getByRole("dialog", { name: "Fox AI support" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Fox AI support" })).toBeHidden();
});

test("keeps the Fox AI bottom sheet inside a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/help");
  await page.getByRole("button", { name: "Open Fox AI support" }).click();

  const dialog = page.getByRole("dialog", { name: "Fox AI support" });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(250);
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(760);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
