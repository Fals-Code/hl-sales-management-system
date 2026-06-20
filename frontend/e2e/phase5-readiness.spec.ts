import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const viewports = [
  { name: "320x568", width: 320, height: 568 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 }
] as const;

async function seedSession(page: Page, settings: { highContrast?: boolean; reducedMotion?: boolean } = {}) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("hl-demo-session", "active");
    window.localStorage.setItem("hl-high-contrast", String(value.highContrast ?? false));
    window.localStorage.setItem("hl-reduced-motion", String(value.reducedMotion ?? true));
    window.localStorage.setItem("hl-comfortable-mode", "true");
  }, settings);
}

async function waitForApp(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.waitForTimeout(250);
}

async function assertNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));
  expect(dimensions.documentWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 2);
  expect(dimensions.bodyWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 2);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath("visual", `${name}.png`), fullPage: true });
}

async function fillLossAuthorization(dialog: Locator) {
  const pin = dialog.locator("label.field").filter({ hasText: "PIN Owner" }).locator('input[type="password"]');
  if (await pin.isVisible()) {
    await pin.fill("1234");
    await dialog.locator("label.field").filter({ hasText: "Alasan" }).locator("textarea").last().fill("Regression transaksi laba negatif");
  }
}

async function addFirstAvailableProduct(page: Page) {
  const addButton = page.locator(".bon-product-option").getByRole("button", { name: "Tambah" }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();
  await expect(page.locator(".bon-cart-row")).toHaveCount(1);
}

test("keyboard-only login reaches dashboard", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const username = page.locator('input[autocomplete="username"]');
  await username.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("admin");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("password");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/dashboard$/);
  await waitForApp(page);
  await capture(page, testInfo, "keyboard-login-dashboard-390x844");
});

test("dashboard renders without horizontal overflow across required viewports", async ({ page }, testInfo) => {
  await seedSession(page);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/#/dashboard");
    await waitForApp(page);
    await assertNoPageOverflow(page);
    await capture(page, testInfo, `dashboard-${viewport.name}`);
  }
});

test("reports remain readable on mobile, tablet, desktop, and browser zoom equivalents", async ({ page }, testInfo) => {
  await seedSession(page);
  for (const viewport of [viewports[0], viewports[1], viewports[3], viewports[5], viewports[6]]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/#/reports");
    await waitForApp(page);
    await expect(page.getByRole("heading", { name: "Laporan", level: 2 })).toBeVisible();
    await assertNoPageOverflow(page);
    await capture(page, testInfo, `reports-${viewport.name}`);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/#/reports");
  await waitForApp(page);
  for (const zoom of [1.25, 1.5]) {
    await page.evaluate((factor) => { document.documentElement.style.zoom = String(factor); }, zoom);
    await page.waitForTimeout(200);
    await capture(page, testInfo, `reports-1366x768-zoom-${Math.round(zoom * 100)}`);
  }
});

test("high contrast and reduced motion preferences are applied", async ({ page }, testInfo) => {
  await seedSession(page, { highContrast: true, reducedMotion: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/#/settings");
  await waitForApp(page);
  await expect(page.locator(".app-shell")).toHaveClass(/app-shell--high-contrast/);
  await expect(page.locator(".app-shell")).toHaveClass(/app-shell--reduced-motion/);
  await capture(page, testInfo, "settings-high-contrast-reduced-motion-1024x768");
});

test("mobile Bon dialog remains operable when the visible height shrinks", async ({ page }, testInfo) => {
  await seedSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/dashboard");
  await waitForApp(page);
  await page.getByRole("button", { name: /Buat Bon/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("textarea").first().focus();
  await page.setViewportSize({ width: 390, height: 520 });
  await dialog.getByRole("button", { name: "Simpan Bon" }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Simpan Bon" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Batal" })).toBeVisible();
  await capture(page, testInfo, "bon-dialog-mobile-keyboard-simulation-390x520");
});

test("create, edit, settle, cancel, settle again, Void, bonus, and report stay consistent", async ({ page }, testInfo) => {
  await seedSession(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/#/dashboard");
  await waitForApp(page);

  await page.getByRole("button", { name: /Buat Bon/ }).first().click();
  const createDialog = page.getByRole("dialog");
  const numberInput = createDialog.locator("label.field").filter({ hasText: "Nomor Bon" }).locator("input");
  await expect(numberInput).toHaveValue(/^BON-\d{8}-\d{3}$/);
  const bonNumber = await numberInput.inputValue();
  await createDialog.locator("label.field").filter({ hasText: "Deskripsi" }).locator("textarea").fill("Regression Phase 5");
  await addFirstAvailableProduct(page);
  await fillLossAuthorization(createDialog);
  await expect(createDialog.getByRole("button", { name: "Simpan Bon" })).toBeEnabled();
  await createDialog.getByRole("button", { name: "Simpan Bon" }).click();
  await expect(createDialog.getByRole("heading", { name: bonNumber })).toBeVisible();
  await capture(page, testInfo, "flow-created-bon");
  await createDialog.getByRole("button", { name: "Kembali ke daftar transaksi" }).click();

  await page.goto(`/#/bon/${encodeURIComponent(bonNumber)}`);
  await waitForApp(page);
  await expect(page.getByRole("heading", { name: bonNumber })).toBeVisible();
  await page.getByRole("button", { name: "Edit Bon" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("label.field").filter({ hasText: "Deskripsi" }).locator("textarea").fill("Regression Phase 5 diperbarui");
  await fillLossAuthorization(editDialog);
  await editDialog.getByRole("button", { name: "Simpan Perubahan" }).click();
  await expect(page.getByText("Perubahan Bon Piutang berhasil disimpan", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Tandai Lunas" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ya, Tandai Lunas" }).click();
  await expect(page.locator(".acceptance-status")).toContainText("Lunas");
  await capture(page, testInfo, "flow-settled-bon");

  await page.goto("/#/settlements");
  await waitForApp(page);
  const paidRow = page.locator(".paid-bon-row").filter({ hasText: bonNumber });
  await expect(paidRow).toBeVisible();
  await paidRow.getByRole("button", { name: "Batalkan Pembayaran" }).click();
  const cancelDialog = page.getByRole("dialog");
  await cancelDialog.locator('input[type="password"]').fill("1234");
  await cancelDialog.locator("textarea").fill("Regression pembatalan pembayaran");
  await cancelDialog.getByRole("button", { name: "Batalkan Pembayaran" }).click();
  await expect(page.getByText(`${bonNumber} kembali menjadi Piutang`, { exact: false })).toBeVisible();

  await page.goto(`/#/bon/${encodeURIComponent(bonNumber)}`);
  await waitForApp(page);
  await expect(page.locator(".acceptance-status")).toContainText("Piutang");
  await page.getByRole("button", { name: "Tandai Lunas" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ya, Tandai Lunas" }).click();
  await page.getByRole("button", { name: "Void Bon" }).click();
  const voidDialog = page.getByRole("dialog");
  await voidDialog.locator('input[type="password"]').fill("1234");
  await voidDialog.locator("textarea").fill("Regression Void transaksi Lunas");
  await voidDialog.getByRole("button", { name: "Void Bon" }).click();
  await expect(page.locator(".acceptance-status")).toContainText("Void");
  await capture(page, testInfo, "flow-void-bon");

  await page.goto("/#/bonus");
  await waitForApp(page);
  const bonusButton = page.getByRole("button", { name: "Buat Bonus Bon" });
  if (await bonusButton.isEnabled()) {
    await bonusButton.click();
    const bonusDialog = page.getByRole("dialog");
    const bonusNumberInput = bonusDialog.locator("label.field").filter({ hasText: "Nomor Bon" }).locator("input");
    await expect(bonusNumberInput).toHaveValue(/^BONUS-\d{8}-\d{3}$/);
    const bonusNumber = await bonusNumberInput.inputValue();
    await addFirstAvailableProduct(page);
    await bonusDialog.getByRole("button", { name: "Simpan Bon" }).click();
    await expect(bonusDialog.getByRole("heading", { name: bonusNumber })).toBeVisible();
    await capture(page, testInfo, "flow-created-bonus-bon");
    await bonusDialog.getByRole("button", { name: "Kembali ke daftar transaksi" }).click();
  }

  await page.goto("/#/reports");
  await waitForApp(page);
  await expect(page.getByText("Piutang (Estimasi/Belum Diakui)")).toBeVisible();
  await assertNoPageOverflow(page);
  await capture(page, testInfo, "flow-final-report");
});
