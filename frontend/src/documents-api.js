// UC04 / UC07 / UC08 client. Error codes come from backend/src/documents.ts and docs/architecture/api-contract.md.
const messages = {
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ. Kiểm tra nhà cung cấp, sản phẩm không trùng và số lượng/giá là số nguyên.',
  INVALID_REFERENCE: 'Nhà cung cấp hoặc sản phẩm không còn tồn tại. Tải lại danh sách.',
  PRODUCT_DISCONTINUED: 'Có sản phẩm đã ngừng kinh doanh nên không thể thêm hoặc xác nhận.',
  EMPTY_DOCUMENT: 'Cần ít nhất một dòng hàng trước khi xác nhận.',
  RECEIPT_NOT_DRAFT: 'Phiếu này không còn là nháp (đã xác nhận hoặc bị xử lý ở nơi khác). Tải lại để xem trạng thái mới.',
  ORDER_NOT_DRAFT: 'Đơn này không còn là nháp (đã xác nhận hoặc bị xử lý ở nơi khác). Tải lại để xem trạng thái mới.',
  ORDER_NOT_CANCELLABLE: 'Chỉ đơn đã xác nhận mới được hủy. Có thể đơn đã được hủy trước đó.',
  INSUFFICIENT_STOCK: 'Không đủ tồn kho.',
  INVENTORY_MISSING: 'Sản phẩm chưa có dòng tồn kho. Báo người phụ trách dữ liệu.',
  NOT_FOUND: 'Chứng từ không còn tồn tại.',
  UNAUTHENTICATED: 'Nhập mã truy cập để tiếp tục.',
  FORBIDDEN: 'Mã truy cập không hợp lệ hoặc tài khoản không có quyền thực hiện thao tác này (hủy đơn chỉ dành cho Quản lý).',
  AUTH_NOT_CONFIGURED: 'Máy chủ chưa cấu hình quyền truy cập.',
  TRANSACTION_RETRY: 'Hệ thống đang bận, thao tác chưa được lưu. Hãy thử lại.',
  LOCK_TIMEOUT: 'Hệ thống đang bận, thao tác chưa được lưu. Hãy thử lại.',
  SCHEMA_UNAVAILABLE: 'Bảng chứng từ chưa được triển khai trên máy chủ.',
};

export class DocumentApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function describe(error) {
  const base = messages[error?.code] || 'Không thể thực hiện thao tác. Vui lòng thử lại sau.';
  if (error?.code === 'INSUFFICIENT_STOCK' && error.sku) return `${base} ${error.sku}: cần ${error.requested}, còn ${error.available}.`;
  if (error?.code === 'PRODUCT_DISCONTINUED' && error.skus?.length) return `${base} (${error.skus.join(', ')})`;
  return base;
}

export async function documentRequest(token, path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (method === 'GET') throw new DocumentApiError('Không tải được dữ liệu. Kiểm tra kết nối và thử lại.', 'NETWORK');
    throw new DocumentApiError('Chưa xác định được kết quả. Tải lại chứng từ để kiểm tra trước khi thử lại.', 'UNKNOWN_RESULT');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new DocumentApiError(describe(data?.error), data?.error?.code);
  if (!data) throw new DocumentApiError('Phản hồi không hợp lệ. Hãy tải lại.', 'BAD_RESPONSE');
  return data;
}
