import { expect, test } from '@playwright/test';

test('quản lý đặt, đổi và bỏ ngưỡng; nhân viên xem cảnh báo', async ({ page, browser }) => {
  const sku = 'RAM-KIN-16';
  await page.goto('/');
  await page.getByLabel('Mã truy cập quản lý').fill(process.env.E2E_MANAGER_TOKEN);
  await page.getByRole('button', { name: 'Kết nối' }).click();
  await expect(page.getByRole('button', { name: 'Ngắt kết nối' })).toBeVisible();
  await page.getByRole('button', { name: 'Cảnh báo tồn kho' }).click();

  const product = page.getByLabel('Chọn linh kiện');
  const threshold = page.getByLabel('Ngưỡng tồn kho', { exact: true });
  const save = page.getByRole('button', { name: 'Lưu ngưỡng' });
  await product.selectOption({ label: sku + ' — Kingston DDR4 16GB' });
  const low = page.getByRole('region', { name: 'Dưới ngưỡng' });
  const missing = page.getByRole('region', { name: 'Chưa cấu hình ngưỡng' });
  await threshold.fill('0');
  await save.click();
  await expect(page.getByRole('status')).toHaveText('Đã lưu ngưỡng.');
  await expect(low).not.toContainText(sku);
  await expect(missing).not.toContainText(sku);

  await page.getByRole('button', { name: 'Tải lại' }).click();
  await expect(threshold).toHaveValue('0');
  await threshold.fill('100');
  await save.click();
  await expect(low.getByRole('row', { name: new RegExp(sku) })).toContainText('100');

  const staff = await browser.newPage({ baseURL: 'http://127.0.0.1:5174' });
  try {
    await staff.goto('/');
    await staff.getByRole('button', { name: 'Cảnh báo tồn kho' }).click();
    await staff.getByLabel('Mã truy cập nhân viên').fill(process.env.E2E_STAFF_TOKEN);
    await staff.getByRole('button', { name: 'Kết nối' }).click();
    await expect(staff.getByRole('region', { name: 'Dưới ngưỡng' })).toContainText(sku);
    await expect(staff.getByLabel('Chọn linh kiện')).toHaveCount(0);
  } finally {
    await staff.close();
  }
  await threshold.fill('');
  await save.click();
  await expect(missing).toContainText(sku);
  await expect(low).not.toContainText(sku);
});
