const products = [
  { id: '1', sku: 'RAM-001', name: 'RAM DDR5 16 GB', category_id: '1', category_name: 'RAM', brand_id: '1', brand_name: 'Kingston', selling_price_vnd: '850000', quantity_on_hand: 7 },
  { id: '2', sku: 'SSD-001', name: 'SSD NVMe 1 TB', category_id: '2', category_name: 'SSD', brand_id: '2', brand_name: 'Samsung', selling_price_vnd: '1600000', quantity_on_hand: 0 },
];
const sales = [
  { date: '2026-11-13', status: 'CONFIRMED', quantity: 3n, unitPrice: 850000n },
  { date: '2026-11-14', status: 'CANCELLED', quantity: 1n, unitPrice: 1600000n },
];

export async function queryRequest(resource, params, { token, mock, signal }) {
  if (mock) {
    if (resource === 'product-search/facets') {
      return {
        categories: products.map(p => ({ id: p.category_id, name: p.category_name })),
        brands: products.map(p => ({ id: p.brand_id, name: p.brand_name })),
      };
    }
    if (resource === 'revenue') {
      const included = sales.filter(s => s.status === 'CONFIRMED' && s.date >= params.from && s.date < params.to);
      return {
        from: params.from,
        to: params.to,
        revenue_vnd: included.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0n).toString(),
        order_count: String(included.length),
      };
    }
    const q = params.q?.trim().normalize('NFC').toLowerCase();
    const rows = products.filter(p =>
      (!q || p.sku.toLowerCase() === q || p.name.toLowerCase().includes(q))
      && (!params.category_id || p.category_id === params.category_id)
      && (!params.brand_id || p.brand_id === params.brand_id)
      && (!params.min_price || Number(p.selling_price_vnd) >= Number(params.min_price))
      && (!params.max_price || Number(p.selling_price_vnd) <= Number(params.max_price))
      && (!params.stock || (params.stock === 'in' ? p.quantity_on_hand > 0 : p.quantity_on_hand === 0)));
    const offset = Number(params.offset || 0);
    return { items: rows.slice(offset, offset + 25), stock_available: true, has_more: rows.length > offset + 25 };
  }
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ''));
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(`/api/${resource}?${search}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    const messages = {
      VALIDATION_ERROR: 'Bộ lọc hoặc khoảng ngày không hợp lệ.',
      UNAUTHENTICATED: 'Nhập mã truy cập để xem dữ liệu.',
      FORBIDDEN: 'Mã truy cập không hợp lệ hoặc tài khoản thiếu quyền.',
      AUTH_NOT_CONFIGURED: 'Máy chủ chưa cấu hình quyền truy cập.',
      STOCK_UNAVAILABLE: 'Dữ liệu tồn chưa có. Bỏ bộ lọc tồn và thử lại.',
      QUERY_SCHEMA_UNAVAILABLE: 'Bảng dữ liệu cho truy vấn chưa được triển khai.',
    };
    throw new Error(messages[body?.error?.code] || 'Không tải được dữ liệu. Hãy thử lại.');
  }
  return body;
}
