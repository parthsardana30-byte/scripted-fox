import { expect, test } from "@playwright/test";

test("validates the hero and carries an anonymous visitor's idea into sign up", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create my script" }).click();
  await expect(page.getByText(/Add a little more detail/)).toBeVisible();

  await page.getByLabel("Start with your video idea").fill("Compare five free editing tools on the same short video");
  await page.getByRole("button", { name: "Create my script" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fdashboard%2Feditor/);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("supports the connection explanation and Video Plan preview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Find my next video" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Make the recommendation personal");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("tab", { name: "Recording notes" }).click();
  await expect(page.getByRole("heading", { name: "Record the same proof for every tool" })).toBeVisible();

  await page.getByRole("button", { name: "Do I need to connect YouTube?" }).click();
  await expect(page.getByText(/You can start with your own idea/)).toBeVisible();
});

test("mobile layout keeps the primary action usable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start planning" })).toBeVisible();
  await expect(page.getByRole("region", { name: "From rough idea to record-ready" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
