import { expect, test, type Page } from "@playwright/test";

const username = process.env.PHASE5_TEST_USERNAME ?? "owner";
const password = process.env.PHASE5_TEST_PASSWORD ?? "phase5-test-password";

async function waitForApp(page: Page) {
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();
}

test("real API persists customer, product, Bon, settlement, bonus, report, and reload state", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await waitForApp(page);

  await page.goto("/#/customers");
  await waitForApp(page);
  await page.getByRole("button", { name: "Tambah Pelanggan" }).click();
  const customerDialog = page.getByRole("dialog");
  await customerDialog.getByLabel("Nama *").fill("Toko Integrasi API");
  await customerDialog.getByLabel("Telepon").fill("081234567890");
  await customerDialog.getByLabel("Alamat").fill("Surabaya");
  await customerDialog.getByLabel("Threshold Bonus *").fill("100000");
  await customerDialog.getByRole("button", { name: "Simpan" }).click();
  await expect(customerDialog).toBeHidden();
  await expect(page.getByText("Toko Integrasi API", { exact: true })).toBeVisible();

  await page.goto("/#/products");
  await waitForApp(page);
  await page.getByRole("button", { name: "Tambah Produk" }).click();
  const productDialog = page.getByRole("dialog");
  await productDialog.getByLabel("Nama produk *").fill("Produk Integrasi API");
  await productDialog.getByLabel("Harga Base *").fill("100000");
  await productDialog.getByLabel("Harga Modal *").fill("60000");
  await productDialog.getByLabel("Stok *").fill("10");
  await productDialog.getByRole("button", { name: "Simpan Produk" }).click();
  await expect(productDialog).toBeHidden();
  await expect(page.getByText("Produk Integrasi API", { exact: true })).toBeVisible();

  await page.goto("/#/dashboard");
  await waitForApp(page);
  await page.getByRole("button", { name: /Buat Bon/ }).first().click();
  const bonDialog = page.getByRole("dialog");
  const bonNumber = await bonDialog.getByLabel("Nomor Bon *").inputValue();
  await bonDialog.getByLabel("Deskripsi").fill("Transaksi browser dengan API nyata");
  await bonDialog.getByRole("button", { name: "Simpan Bon" }).click();
  await expect(bonDialog.getByRole("heading", { name: bonNumber })).toBeVisible();
  await bonDialog.getByRole("button", { name: "Selesai" }).click();

  await page.reload();
  await waitForApp(page);
  await page.goto(`/#/bon/${encodeURIComponent(bonNumber)}`);
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: bonNumber })).toBeVisible();
  await expect(page.getByText("Transaksi browser dengan API nyata", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit Bon" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Deskripsi").fill("Transaksi API sudah diperbarui");
  await editDialog.getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(editDialog).toBeHidden();
  await expect(page.getByText("Perubahan Bon Piutang berhasil disimpan", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Tandai Lunas" }).click();
  const settlementDialog = page.getByRole("dialog");
  await settlementDialog.getByRole("button", { name: "Ya, Tandai Lunas" }).click();
  await expect(page.locator(".acceptance-status")).toContainText("Lunas");

  await page.reload();
  await waitForApp(page);
  await expect(page.locator(".acceptance-status")).toContainText("Lunas");

  await page.goto("/#/bonus");
  await waitForApp(page);
  await expect(page.getByText("1 unit", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Buat Bonus Bon" }).click();
  const bonusDialog = page.getByRole("dialog");
  const bonusNumber = await bonusDialog.getByLabel("Nomor Bon *").inputValue();
  expect(bonusNumber).toMatch(/^BONUS-/);
  await bonusDialog.getByRole("button", { name: "Simpan Bon" }).click();
  await expect(bonusDialog.getByRole("heading", { name: bonusNumber })).toBeVisible();
  await bonusDialog.getByRole("button", { name: "Selesai" }).click();
  await expect(page.getByText(bonusNumber, { exact: true })).toBeVisible();

  await page.goto("/#/reports");
  await waitForApp(page);
  await expect(page.getByText("Omzet Diakui", { exact: true })).toBeVisible();
  await expect(page.getByText("Memuat rekap backend...")).toBeHidden();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
});
