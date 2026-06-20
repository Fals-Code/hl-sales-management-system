import { expect, test } from "@playwright/test";

const username = process.env.PHASE5_TEST_USERNAME ?? "owner";
const password = process.env.PHASE5_TEST_PASSWORD ?? "phase5-test-password";

test("backend notification appears in the center without reloading", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();

  await page.goto("/#/products");
  await page.getByRole("button", { name: "Tambah Produk" }).click();
  const dialog = page.getByRole("dialog");
  const productName = `Produk Notifikasi ${Date.now()}`;
  await dialog.getByLabel("Nama produk *").fill(productName);
  await dialog.getByLabel("Harga Base *").fill("100000");
  await dialog.getByLabel("Harga Modal *").fill("60000");
  await dialog.getByLabel("Stok *").fill("3");
  await dialog.getByRole("button", { name: "Simpan Produk" }).click();
  await expect(dialog).toBeHidden();

  const bell = page.locator(".notification-button");
  await expect(bell).toHaveAttribute("aria-label", /[1-9]\d* notifikasi belum dibaca/);
  await bell.click();

  const center = page.getByRole("region", { name: "Pusat notifikasi" });
  await expect(center).toBeVisible();
  await expect(center.getByRole("button", { name: new RegExp(`Produk berhasil ditambahkan ${productName}`) })).toBeVisible();
  await expect(center.getByRole("button", { name: new RegExp(`Stok produk menipis ${productName}`) })).toBeVisible();

  await center.getByRole("button", { name: /Tandai semua dibaca/ }).click();
  await expect(center.getByText("0 belum dibaca", { exact: true })).toBeVisible();
});
