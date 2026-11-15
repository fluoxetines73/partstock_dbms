import { test, expect } from '@playwright/test';

async function connect(page) {
  await page.goto('/');
  await page.getByLabel('Mã truy cập quản lý').fill(process.env.E2E_MANAGER_TOKEN);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thêm danh mục' })).toBeEnabled();
}

// Missing/wrong CRUD request, false success, broken FK errors or persistent tokens fail these checks.
for (const [tab, noun] of [['Danh mục', 'danh mục'], ['Thương hiệu', 'thương hiệu']]) {
  test(`${tab}: CRUD persists in MySQL, duplicates and product references are protected`, async ({ page }) => {
    await connect(page);
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: `Thêm ${noun}` }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Tên').fill('  Nghiệm thu ' + tab + '  ');
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    let row = page.getByRole('row').filter({ hasText: 'Nghiệm thu ' + tab });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Sửa' }).click();
    await dialog.getByLabel('Tên').fill('Đã sửa ' + tab);
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    row = page.getByRole('row').filter({ hasText: 'Đã sửa ' + tab });
    await expect(row).toBeVisible();
    await page.getByRole('button', { name: 'Tải lại' }).click();
    await expect(row).toBeVisible();
    await page.getByRole('button', { name: `Thêm ${noun}` }).click();
    await dialog.getByLabel('Tên').fill('Đã sửa ' + tab);
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('đã tồn tại');
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await row.getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(row).toHaveCount(0);
    await page.getByRole('row').nth(1).getByRole('button', { name: 'Xóa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('đang được sản phẩm sử dụng');
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    if (tab === 'Danh mục') await page.screenshot({ path: '/tmp/partstock-uc01-desktop.png', fullPage: true });
  });
}

test('invalid session and lost connection cannot show a successful write', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Mã truy cập quản lý').fill('incorrect');
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('không hợp lệ');
  await connect(page);
  await page.getByRole('button', { name: 'Thêm danh mục' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tên').fill(' ');
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('1 đến 100');
  await dialog.getByLabel('Tên').fill('x'.repeat(101));
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('1 đến 100');
  await dialog.getByLabel('Tên').fill('Network failure');
  await page.route('**/api/categories', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('kiểm tra lại danh sách');
  await expect(dialog.getByLabel('Tên')).toHaveValue('Network failure');
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(page.getByLabel('Mã truy cập quản lý')).toHaveValue('');
});

test('slow writes disable duplicate submission; keyboard and narrow layout work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connect(page);
  await page.getByRole('button', { name: 'Thêm danh mục' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Tên')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Thêm danh mục' }).click();
  await dialog.getByLabel('Tên').fill('Slow save');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/categories', async route => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  });
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled();
  release();
  await expect(page.getByRole('row').filter({ hasText: 'Slow save' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/partstock-uc01-mobile.png', fullPage: true });
});

test('tab switches discard stale results; load errors recover without false empty state', async ({ page }) => {
  await connect(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/categories', async route => { await gate; await route.continue().catch(() => {}); });
  await page.getByRole('button', { name: 'Tải lại' }).click();
  await expect(page.getByRole('status')).toContainText('Đang tải');
  await page.getByRole('tab', { name: 'Thương hiệu', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Kingston' })).toBeVisible();
  release();
  await expect(page.getByRole('row').filter({ hasText: 'RAM' })).toHaveCount(0);
  await page.route('**/api/brands', route => route.abort());
  await page.getByRole('button', { name: 'Tải lại' }).click();
  await expect(page.getByRole('alert')).toContainText('Không tải được');
  await expect(page.getByRole('button', { name: 'Thêm thương hiệu' })).toBeDisabled();
  await page.unroute('**/api/brands');
  await page.getByRole('button', { name: 'Tải lại' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Kingston' })).toBeVisible();
});
