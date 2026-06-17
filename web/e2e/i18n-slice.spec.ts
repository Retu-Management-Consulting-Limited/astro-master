import { test, expect } from "@playwright/test";

test("zh landing at / renders Chinese + html lang=zh", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByText("不寒暄 · 直接说中")).toBeVisible();
});

test("ru landing at /ru renders Russian + html lang=ru", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByText("Без болтовни · Сразу по сути")).toBeVisible();
});
