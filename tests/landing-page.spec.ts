import { expect, test } from "@playwright/test";

test("validates the hero and carries an anonymous visitor's idea into sign up", async ({ page }) => {
  await page.route("**/api/landing-intent", async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ destination: "/sign-up?next=%2Fdashboard%2Feditor" }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Create my script" }).click();
  await expect(page.getByText(/Add a little more detail/)).toBeVisible();

  await page.getByLabel("Start with your video idea").fill("Compare five free editing tools on the same short video");
  await page.getByRole("button", { name: "Create my script" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fdashboard%2Feditor/);
  await expect(page.getByRole("heading", { name: "Sign Up" })).toBeVisible();
});

test("supports the connection explanation and animated script preview", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Plan from my channel" }).click();
  await expect(page.getByRole("dialog")).toContainText("Make the recommendation personal");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: "Show ready step" }).click();
  await expect(page.getByRole("heading", { name: "Today’s script is ready." })).toBeVisible();
});

test("mobile layout keeps the primary action usable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start planning" })).toBeVisible();
  await expect(page.getByRole("region", { name: "From no topic to a ready YouTube script" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Google sign-in uses a direct OAuth navigation link", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
    "href",
    "/auth/google?next=%2Fdashboard",
  );
});

