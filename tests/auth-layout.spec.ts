import { expect, test } from "@playwright/test";

for (const path of ["/sign-in", "/sign-up"]) {
  test(`${path} keeps its mobile header above the form`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const header = page.locator(".auth-header--global");
    const title = page.getByRole("heading", { level: 1 });
    await expect(header).toBeVisible();
    await expect(title).toBeVisible();
    const headerBox = await header.boundingBox();
    const titleBox = await title.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(headerBox!.y + headerBox!.height).toBeLessThan(titleBox!.y);
  });
}
