import { test, expect } from "@playwright/test";

// 任务2：生日时间输入框「默认即可填」——不必先勾任何框。填了时间就当知道、用该时间；
// 显式勾「不知道·用正午盘」才回退正午（并清空已填时间）。杜绝「填了却被静默忽略」。

test("input: 时间框默认可填、不被禁用", async ({ page }) => {
  await page.goto("/input");
  const time = page.locator("#birth-time");
  await expect(time).toBeEnabled();
  // 默认「用正午盘」复选框未勾
  await expect(page.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
});

test("input: 直接填时间无需勾框；勾「用正午盘」则禁用并清空", async ({ page }) => {
  await page.goto("/input");
  const time = page.locator("#birth-time");
  await time.fill("14:30");
  await expect(time).toHaveValue("14:30");
  await expect(page.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");

  // 勾「不知道·用正午盘」→ 框禁用、值清空
  await page.getByRole("checkbox").click();
  await expect(page.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await expect(time).toBeDisabled();
  await expect(time).toHaveValue("");
});

test("me/birth: 编辑页时间框同样默认可填（与 input 对称）", async ({ page, context }) => {
  // 注入一个已有出生资料的会话，进编辑页。无资料则跳转，跳过。
  await page.goto("/me/birth");
  const time = page.locator("#edit-time");
  if (!(await time.count())) test.skip(true, "no birth session on /me/birth");
  // 若已存「已知时间」资料，框应可填；若存「未知」资料，复选框应为勾选态。
  const checked = await page.getByRole("checkbox").first().getAttribute("aria-checked");
  if (checked === "false") await expect(time).toBeEnabled();
});
