import { expect, test, type Page } from "@playwright/test";

const username = process.env.PHASE5_TEST_USERNAME ?? "owner";
const password = process.env.PHASE5_TEST_PASSWORD ?? "phase5-test-password";
const ownerPin = process.env.OWNER_PIN ?? "246810";

test.describe.configure({ retries: 0 });

async function waitForApp(page: Page) {
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator("#main-content")).toBeVisible();
}

async function finishBonSuccess(page: Page, bonNumber: string, downloadPdf = false) {
  await expect(page.getByRole("heading", { name: bonNumber })).toBeVisible();
  if (downloadPdf) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Cetak Bon" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  }
  await page.getByRole("button", { name: "Kembali ke daftar transaksi" }).click();
  await expect(page).toHaveURL(/#\/bons$/);
}

async function addFirstAvailableProduct(page: Page) {
  const addButton = page.locator(".bon-product-option").getByRole("button", { name: "Tambah" }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.locator(".bon-cart-row")).toHaveCount(1);
}

async function createNormalBon(page: Page, description: string) {
  await page.goto("/#/dashboard");
  await waitForApp(page);
  await page.getByRole("button", { name: /Buat Bon/ }).first().click();
  await expect(page).toHaveURL(/#\/bons\/new/);
  const bonNumber = await page.getByLabel("Nomor Bon *").inputValue();
  await page.getByLabel("Deskripsi").fill(description);
  await addFirstAvailableProduct(page);
  await page.getByRole("button", { name: "Simpan Bon" }).click();
  await finishBonSuccess(page, bonNumber, true);
  await waitForApp(page);
  await expect(page.getByText(bonNumber, { exact: true }).first()).toBeVisible();
  return bonNumber;
}

async function settleCurrentBon(page: Page) {
  await page.getByRole("button", { name: "Tandai Lunas" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Ya, Tandai Lunas" }).click();
  await expect(page.locator(".acceptance-status")).toContainText("Lunas");
}

test("real API persists every Phase 5 write path and reload state", async ({ page }) => {
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
  await waitForApp(page);
  const customerCard = page.locator(".acceptance-customer-card").filter({ hasText: "Toko Integrasi API" }).first();
  await expect(customerCard).toBeVisible();

  await customerCard.click();
  await page.getByRole("button", { name: "Edit" }).click();
  const customerEditDialog = page.getByRole("dialog");
  await customerEditDialog.getByLabel("Telepon").fill("081234567891");
  await customerEditDialog.getByRole("button", { name: "Simpan" }).click();
  await expect(customerEditDialog).toBeHidden();
  await waitForApp(page);
  await expect(page.getByText("081234567891", { exact: false })).toBeVisible();

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
  await waitForApp(page);
  const productCard = page.locator(".acceptance-product-card").filter({ hasText: "Produk Integrasi API" }).first();
  await expect(productCard).toBeVisible();

  await productCard.getByRole("button", { name: "Edit" }).click();
  const productEditDialog = page.getByRole("dialog");
  await productEditDialog.getByLabel("Nama produk *").fill("Produk Integrasi API Final");
  await productEditDialog.getByRole("button", { name: "Simpan Produk" }).click();
  await expect(productEditDialog).toBeHidden();
  await waitForApp(page);
  await expect(page.getByText("Produk Integrasi API Final", { exact: true }).first()).toBeVisible();

  const firstBonNumber = await createNormalBon(page, "Transaksi browser dengan API nyata");

  await page.reload();
  await waitForApp(page);
  await page.goto(`/#/bon/${encodeURIComponent(firstBonNumber)}`);
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: firstBonNumber })).toBeVisible();
  await expect(page.getByText("Transaksi browser dengan API nyata", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit Bon" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Deskripsi").fill("Transaksi API sudah diperbarui");
  await editDialog.getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(editDialog).toBeHidden();
  await waitForApp(page);
  await expect(page.getByText("Transaksi API sudah diperbarui", { exact: true })).toBeVisible();

  await settleCurrentBon(page);
  await page.reload();
  await waitForApp(page);
  await expect(page.locator(".acceptance-status")).toContainText("Lunas");

  await page.goto("/#/settlements");
  await waitForApp(page);
  const paidRow = page.locator(".paid-bon-row").filter({ hasText: firstBonNumber });
  await expect(paidRow).toBeVisible();
  await paidRow.getByRole("button", { name: "Batalkan Pembayaran" }).click();
  const cancelDialog = page.getByRole("dialog");
  await cancelDialog.locator('input[type="password"]').fill(ownerPin);
  await cancelDialog.locator("textarea").fill("Koreksi pembayaran pengujian integrasi");
  await cancelDialog.getByRole("button", { name: "Batalkan Pembayaran" }).click();
  await expect(cancelDialog).toBeHidden();
  await waitForApp(page);

  await page.goto(`/#/bon/${encodeURIComponent(firstBonNumber)}`);
  await waitForApp(page);
  await expect(page.locator(".acceptance-status")).toContainText("Piutang");
  await settleCurrentBon(page);

  const secondBonNumber = await createNormalBon(page, "Transaksi khusus pengujian Void");
  await page.goto(`/#/bon/${encodeURIComponent(secondBonNumber)}`);
  await waitForApp(page);
  await settleCurrentBon(page);
  await page.getByRole("button", { name: "Void Bon" }).click();
  const voidDialog = page.getByRole("dialog");
  await voidDialog.locator('input[type="password"]').fill(ownerPin);
  await voidDialog.locator("textarea").fill("Void transaksi pengujian integrasi");
  await voidDialog.getByRole("button", { name: "Void Bon" }).click();
  await expect(page.locator(".acceptance-status")).toContainText("Void");

  await page.reload();
  await waitForApp(page);
  await expect(page.locator(".acceptance-status")).toContainText("Void");

  await page.goto("/#/bonus");
  await waitForApp(page);
  await expect(page.getByText("1 unit", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Buat Bonus Bon" }).click();
  await expect(page).toHaveURL(/#\/bons\/new/);
  const bonusNumber = await page.getByLabel("Nomor Bon *").inputValue();
  expect(bonusNumber).toMatch(/^BONUS-/);
  await addFirstAvailableProduct(page);
  await page.getByRole("button", { name: "Simpan Bon" }).click();
  await finishBonSuccess(page, bonusNumber);
  await waitForApp(page);
  await page.goto("/#/bonus");
  await waitForApp(page);
  await expect(page.getByText(bonusNumber, { exact: true }).first()).toBeVisible();

  const deletedBonNumber = await createNormalBon(page, "Transaksi khusus pengujian soft-delete");
  await page.goto(`/#/bon/${encodeURIComponent(deletedBonNumber)}`);
  await waitForApp(page);
  await page.getByRole("button", { name: "Nonaktifkan Bon" }).click();
  const deleteDialog = page.getByRole("dialog");
  await deleteDialog.getByRole("button", { name: "Nonaktifkan Bon" }).click();
  await expect(page).toHaveURL(/#\/bons$/);

  await page.goto(`/#/bon/${encodeURIComponent(deletedBonNumber)}`);
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: "Bon tidak ditemukan" })).toBeVisible();

  await page.goto("/#/reports");
  await waitForApp(page);
  await expect(page.getByText("Omzet Diakui", { exact: true })).toBeVisible();
  await expect(page.getByText("Memuat rekap backend...")).toBeHidden();
  await expect(page.getByText(firstBonNumber, { exact: true }).first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

  const logoutStatus = await page.evaluate(async () => {
    const response = await fetch("http://127.0.0.1:3000/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    return response.status;
  });
  expect(logoutStatus).toBe(200);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Masuk ke aplikasi" })).toBeVisible();
});
