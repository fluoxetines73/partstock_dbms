import { test, expect } from '@playwright/test';

async function openManagement(page, section) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: section, exact: true }).click();
  await page.getByLabel('Mã truy cập quản lý').fill(process.env.E2E_MANAGER_TOKEN);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
}

async function fillProduct(dialog, { name, sku, price, specifications }) {
  await dialog.getByLabel('Tên', { exact: true }).fill(name);
  await dialog.getByLabel('SKU', { exact: true }).fill(sku);
  await dialog.getByLabel('Danh mục', { exact: true }).selectOption({ label: 'RAM' });
  await dialog.getByLabel('Thương hiệu', { exact: true }).selectOption({ label: 'Kingston' });
  await dialog.getByLabel('Giá bán (VND)', { exact: true }).fill(price);
  await dialog.getByLabel('Thông số (tùy chọn)', { exact: true }).fill(specifications);
}

test('UC02 lists, adds and edits parts through MySQL', async ({ page }) => {
  await openManagement(page, 'Linh kiện');
  await expect(page.getByRole('row').filter({ hasText: 'SSD-SAM-500' })).toContainText('Ngừng kinh doanh');
  await page.getByRole('button', { name: 'Thêm linh kiện' }).click();
  const dialog = page.getByRole('dialog');
  const save = dialog.getByRole('button', { name: 'Lưu', exact: true });
  await fillProduct(dialog, { name: 'RAM kiểm thử UI', sku: 'UC02-UI-RAM', price: '-1', specifications: '[]' });
  await save.click();
  await expect(dialog.getByRole('alert')).toContainText('Giá bán phải là số nguyên');
  await dialog.getByLabel('Giá bán (VND)').fill('450000');
  await save.click();
  await expect(dialog.getByRole('alert')).toContainText('đối tượng JSON');
  await dialog.getByLabel('Thông số (tùy chọn)').fill('{"capacity_gb":8}');
  await save.click();

  const row = page.getByRole('row').filter({ hasText: 'UC02-UI-RAM' });
  await expect(row).toContainText('450.000');
  await expect(row).toContainText('Kingston');
  await row.getByText('Thông số', { exact: true }).click();
  await expect(row).toContainText('"capacity_gb": 8');
  await row.getByRole('button', { name: 'Sửa RAM kiểm thử UI' }).click();
  await dialog.getByLabel('Giá bán (VND)').fill('470000');
  await dialog.getByLabel('Thông số (tùy chọn)').clear();
  await save.click();
  await expect(row).toContainText('470.000');

  await openManagement(page, 'Linh kiện');
  await expect(row).toContainText('470.000');
  await expect(row.getByText('Thông số', { exact: true })).toHaveCount(0);
});

test('UC03 shares the manager session and persists partial contact edits', async ({ page }) => {
  await openManagement(page, 'Linh kiện');
  await expect(page.getByRole('button', { name: 'Thêm linh kiện' })).toBeEnabled();
  await page.getByRole('navigation').getByRole('button', { name: 'Nhà cung cấp', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Nha cung cap mau A' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm nhà cung cấp' }).click();
  const dialog = page.getByRole('dialog');
  const save = dialog.getByRole('button', { name: 'Lưu', exact: true });
  await dialog.getByLabel('Tên', { exact: true }).fill('Nhà cung cấp kiểm thử UI');
  await dialog.getByLabel('Email (tùy chọn)').fill('supplier-ui@example.invalid');
  await save.click();

  const row = page.getByRole('row').filter({ hasText: 'Nhà cung cấp kiểm thử UI' });
  await expect(row).toContainText('supplier-ui@example.invalid');
  await row.getByRole('button', { name: 'Sửa Nhà cung cấp kiểm thử UI' }).click();
  await dialog.getByLabel('Điện thoại (tùy chọn)').fill('0901234567');
  await dialog.getByLabel('Email (tùy chọn)').clear();
  const patch = page.waitForRequest(request => request.method() === 'PATCH' && request.url().includes('/api/suppliers/'));
  await save.click();
  expect((await patch).postDataJSON()).toEqual({ phone: '0901234567', email: null });
  await expect(row).toContainText('0901234567');
  await openManagement(page, 'Nhà cung cấp');
  await expect(row).toContainText('0901234567');
  await expect(row).not.toContainText('supplier-ui@example.invalid');
});

test('UC02 preserves the form on duplicate SKU at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openManagement(page, 'Linh kiện');
  const add = page.getByRole('button', { name: 'Thêm linh kiện' });
  await add.click();
  const dialog = page.getByRole('dialog');
  await fillProduct(dialog, { name: 'Trùng SKU', sku: 'RAM-KIN-08', price: '450000', specifications: '' });
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('SKU này đã tồn tại');
  await expect(dialog.getByLabel('Tên', { exact: true })).toHaveValue('Trùng SKU');
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
