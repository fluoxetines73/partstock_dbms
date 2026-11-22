const messages = {
  NAME_CONFLICT: 'Tên này đã tồn tại. Hãy chọn một tên khác.',
  RESOURCE_IN_USE: 'Mục này đang được sản phẩm sử dụng nên không thể xóa.',
  NOT_FOUND: 'Mục này không còn tồn tại. Đóng hộp thoại và tải lại danh sách.',
  VALIDATION_ERROR: 'Tên phải có từ 1 đến 100 ký tự sau khi bỏ khoảng trắng hai đầu.',
  UNAUTHENTICATED: 'Phiên truy cập không hợp lệ. Hãy kết nối lại.',
  FORBIDDEN: 'Mã truy cập không hợp lệ hoặc không có quyền quản lý.',
  AUTH_NOT_CONFIGURED: 'Chức năng quản lý chưa được cấu hình. Liên hệ người phụ trách.',
};

export async function catalogRequest(token, resource, { method = 'GET', body, signal, errorMessages } = {}) {
  let response;
  try {
    response = await fetch(`/api/${resource}`, {
      method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(method === 'GET' ? 'Không tải được dữ liệu. Kiểm tra kết nối và thử lại.'
      : 'Chưa xác định được kết quả. Hãy đóng hộp thoại và kiểm tra lại danh sách trước khi thử lại.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = data?.error?.code;
    throw new Error(errorMessages?.[code] || messages[code] || 'Không thể thực hiện thao tác. Vui lòng thử lại sau.');
  }
  if (!data) throw new Error('Phản hồi không hợp lệ. Hãy tải lại danh sách.');
  return data;
}
