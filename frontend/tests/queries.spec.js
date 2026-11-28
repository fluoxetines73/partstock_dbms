import { expect, test } from '@playwright/test';

test('C live search reads the stock rows written by migration 003 and the D seed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await page.getByLabel('Mã truy cập tra cứu').fill(process.env.E2E_STAFF_TOKEN);
  await page.getByRole('button', { name: 'Kết nối' }).click();
  await page.getByLabel('Mã hoặc tên').fill('RAM-KIN-08');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByRole('row', { name: /RAM-KIN-08.*8$/ })).toBeVisible();
  await expect(page.getByText('Chưa có dữ liệu tồn kho.')).toHaveCount(0);
  await page.getByLabel('Tồn kho').selectOption('out');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByText('Không có linh kiện phù hợp.')).toBeVisible();
});

test('C search mock combines category, brand, price and stock and shows empty results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dùng dữ liệu mẫu' }).check();
  await page.getByLabel('Danh mục', { exact: true }).selectOption({ label: 'RAM' });
  await page.getByLabel('Thương hiệu', { exact: true }).selectOption({ label: 'Kingston' });
  await page.getByLabel('Giá tối thiểu').fill('800000');
  await page.getByLabel('Giá tối đa').fill('900000');
  await page.getByLabel('Tồn kho').selectOption('in');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByRole('row', { name: /RAM-001/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /SSD-001/ })).toHaveCount(0);
  await page.getByLabel('Mã hoặc tên').fill('không có');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await expect(page.getByText('Không có linh kiện phù hợp.')).toBeVisible();
});

test('C revenue mock excludes cancelled orders and rejects a reversed date range', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Doanh thu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Xem báo cáo' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Dùng dữ liệu mẫu' }).check();
  await page.getByRole('button', { name: 'Xem báo cáo' }).click();
  await expect(page.getByRole('region', { name: 'Kết quả doanh thu' })).toContainText('2.550.000');
  await page.getByLabel('Đến trước ngày').fill('2026-10-31');
  await page.getByRole('button', { name: 'Xem báo cáo' }).click();
  await expect(page.getByRole('alert')).toContainText('Ngày bắt đầu phải trước ngày kết thúc');
});

test('C revenue result keeps its queried period until a new period is submitted', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Doanh thu', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dùng dữ liệu mẫu' }).check();
  const submit = page.getByRole('button', { name: 'Xem báo cáo' });
  const result = page.getByRole('region', { name: 'Kết quả doanh thu' });

  await submit.click();
  await expect(result).toContainText('Kỳ báo cáo từ 01/11/2026 đến trước 01/12/2026.');
  await expect(result.getByRole('heading')).toHaveText(/2\.550\.000/);

  await page.getByLabel('Từ ngày').fill('2026-12-01');
  await page.getByLabel('Đến trước ngày').fill('2027-01-01');
  await expect(result).toContainText('Kỳ báo cáo từ 01/11/2026 đến trước 01/12/2026.');
  await expect(result.getByRole('heading')).toHaveText(/2\.550\.000/);

  await submit.click();
  await expect(result).toContainText('Kỳ báo cáo từ 01/12/2026 đến trước 01/01/2027.');
  await expect(result.getByRole('heading')).toHaveText(/^0\s+₫$/);
  await expect(result).toContainText('0 đơn đã xác nhận');
});

test('C live revenue displays the confirmed order and period from the MySQL seed', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Mã truy cập quản lý').fill(process.env.E2E_MANAGER_TOKEN);
  await page.getByRole('button', { name: 'Kết nối', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ngắt kết nối' })).toBeVisible();
  await page.getByRole('button', { name: 'Doanh thu', exact: true }).click();
  await page.getByLabel('Từ ngày').fill('2026-11-05');
  await page.getByLabel('Đến trước ngày').fill('2026-11-06');
  await page.getByRole('button', { name: 'Xem báo cáo' }).click();

  const result = page.getByRole('region', { name: 'Kết quả doanh thu' });
  await expect(result).toContainText('Kỳ báo cáo từ 05/11/2026 đến trước 06/11/2026.');
  await expect(result.getByRole('heading')).toHaveText(/840\.000/);
  await expect(result).toContainText('1 đơn đã xác nhận');
});
