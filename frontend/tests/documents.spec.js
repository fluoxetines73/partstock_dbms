import { expect, test } from '@playwright/test';

const staff = process.env.E2E_STAFF_TOKEN;
const manager = process.env.E2E_MANAGER_TOKEN;

async function open(page, tab, token) {
  await page.goto('/');
  await page.getByRole('button', { name: tab, exact: true }).click();
  await page.getByLabel('Mã truy cập (nhân viên hoặc quản lý)').fill(token);
  await page.getByRole('button', { name: 'Kết nối' }).click();
}

async function pick(page, line, sku) {
  const select = page.getByLabel(`Sản phẩm dòng ${line}`);
  const value = await select.locator('option', { hasText: sku }).first().getAttribute('value');
  await select.selectOption(value);
}

async function stock(request, sku) {
  const response = await request.get(`/api/product-search?q=${sku}`, { headers: { Authorization: `Bearer ${manager}` } });
  return (await response.json()).items[0].quantity_on_hand;
}

test('UC04 staff saves a draft without touching stock, then confirms it once', async ({ page, request }) => {
  const before = await stock(request, 'SSD-KIN-500');
  await open(page, 'Nhập kho', staff);
  await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
  await page.getByLabel('Nhà cung cấp').selectOption({ label: 'Nha cung cap mau A' });
  await pick(page, 1, 'SSD-KIN-500');
  await page.getByLabel('Số lượng dòng 1').fill('4');
  await page.getByLabel('Giá nhập dòng 1').fill('800000');
  await page.getByRole('button', { name: 'Lưu nháp' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu nháp PN-' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /PN-\d{8}-\d{6} · Nháp/ })).toBeVisible();
  expect(await stock(request, 'SSD-KIN-500')).toBe(before);

  await page.getByRole('button', { name: 'Xác nhận nhập kho' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã xác nhận phiếu nhập' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Đã xác nhận/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xác nhận nhập kho' })).toHaveCount(0);
  expect(await stock(request, 'SSD-KIN-500')).toBe(before + 4);
});

test('UC04 rejects an empty confirmation and lets a draft be deleted without changing stock', async ({ page, request }) => {
  const before = await stock(request, 'RAM-KIN-16');
  await open(page, 'Nhập kho', staff);
  await page.getByRole('button', { name: 'Tạo phiếu nhập' }).click();
  await page.getByLabel('Nhà cung cấp').selectOption({ label: 'Nha cung cap mau B' });
  await page.getByRole('button', { name: 'Xác nhận nhập kho' }).click();
  await expect(page.getByRole('alert')).toContainText('Cần ít nhất một dòng hàng');
  await expect(page.getByRole('heading', { name: /PN-\d{8}-\d{6} · Nháp/ })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa nháp' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa nháp' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã xóa bản nháp' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Chi tiết chứng từ' })).toHaveCount(0);
  expect(await stock(request, 'RAM-KIN-16')).toBe(before);
});

test('UC07 sale deducts stock and only a manager can cancel it (UC08)', async ({ page, request }) => {
  const before = await stock(request, 'RAM-KIN-16');
  await open(page, 'Bán hàng', staff);
  await page.getByRole('button', { name: 'Tạo đơn bán' }).click();
  await pick(page, 1, 'RAM-KIN-16');
  await page.getByLabel('Số lượng dòng 1').fill('2');
  await page.getByRole('button', { name: 'Xác nhận bán' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã xác nhận đơn' })).toBeVisible();
  await expect(page.getByText('Tổng: 1.580.000')).toBeVisible();
  expect(await stock(request, 'RAM-KIN-16')).toBe(before - 2);

  // Staff sees the cancel form but the server refuses: UC08 is Manager only.
  await page.getByLabel('Lý do hủy (bắt buộc)').fill('Khách đổi ý');
  await page.getByRole('button', { name: 'Hủy đơn và hoàn kho' }).click();
  await expect(page.getByRole('alert')).toContainText('chỉ dành cho Quản lý');
  expect(await stock(request, 'RAM-KIN-16')).toBe(before - 2);

  await open(page, 'Bán hàng', manager);
  await page.getByRole('row', { name: /Đã xác nhận/ }).first().getByRole('button', { name: /Mở DB-/ }).click();
  await page.getByLabel('Lý do hủy (bắt buộc)').fill('Khách đổi ý');
  await page.getByRole('button', { name: 'Hủy đơn và hoàn kho' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã hủy đơn' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Đã hủy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hủy đơn và hoàn kho' })).toHaveCount(0);
  expect(await stock(request, 'RAM-KIN-16')).toBe(before);
});

test('UC07 insufficient stock keeps the order a draft and stock unchanged', async ({ page, request }) => {
  const before = await stock(request, 'SSD-SAM-1000');
  await open(page, 'Bán hàng', staff);
  await page.getByRole('button', { name: 'Tạo đơn bán' }).click();
  await pick(page, 1, 'SSD-SAM-1000');
  await page.getByLabel('Số lượng dòng 1').fill('99');
  await page.getByRole('button', { name: 'Xác nhận bán' }).click();
  await expect(page.getByRole('alert')).toContainText('Không đủ tồn kho. SSD-SAM-1000: cần 99, còn');
  await expect(page.getByRole('heading', { name: /DB-\d{8}-\d{6} · Nháp/ })).toBeVisible();
  expect(await stock(request, 'SSD-SAM-1000')).toBe(before);
});
