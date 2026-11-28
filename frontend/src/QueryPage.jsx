import React, { useEffect, useState } from 'react';
import { queryRequest } from './query-api.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const emptyFilters = { q: '', category_id: '', brand_id: '', min_price: '', max_price: '', stock: '' };

function formatDate(value) {
  return value.split('-').reverse().join('/');
}

export function QueryPage({ managerToken, revenue }) {
  const [mock, setMock] = useState(false);
  const [staffToken, setStaffToken] = useState('');
  const [filters, setFilters] = useState(emptyFilters);
  const [dates, setDates] = useState({ from: '2026-11-01', to: '2026-12-01' });
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(null);
  const [facets, setFacets] = useState(null);
  const [facetError, setFacetError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = managerToken || staffToken.trim();
  const canQuery = mock || (revenue ? Boolean(managerToken) : Boolean(token));

  useEffect(() => {
    if (revenue || !canQuery) return;
    const controller = new AbortController();
    setFacetError('');
    queryRequest('product-search/facets', {}, { token, mock, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setFacets(result); })
      .catch(err => { if (!controller.signal.aborted) setFacetError(err.message); });
    return () => controller.abort();
  }, [token, mock, canQuery, revenue]);

  useEffect(() => {
    if (!request || !canQuery) return;
    const controller = new AbortController();
    setBusy(true);
    setError('');
    setResponse(null);
    queryRequest(revenue ? 'revenue' : 'product-search', request, { token, mock, signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setResponse(result); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [request, token, mock, canQuery, revenue]);

  function submit(event) {
    event.preventDefault();
    if (revenue && dates.from >= dates.to) {
      setResponse(null);
      setError('Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }
    if (!revenue && filters.min_price && filters.max_price && Number(filters.min_price) > Number(filters.max_price)) {
      setResponse(null);
      setError('Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.');
      return;
    }
    setRequest(revenue ? { ...dates } : { ...filters, offset: 0 });
  }

  function resetResults() {
    setFacets(null);
    setFacetError('');
    setRequest(null);
    setResponse(null);
    setBusy(false);
    setError('');
  }
  const change = event => setFilters({ ...filters, [event.target.name]: event.target.value });
  return <main className="query-page">
    <h1>{revenue ? 'Báo cáo doanh thu' : 'Tra cứu linh kiện'}</h1>
    <label className="query-mode"><input type="checkbox" checked={mock} onChange={event => {
      resetResults();
      setFilters(emptyFilters);
      setMock(event.target.checked);
    }} /> Dùng dữ liệu mẫu</label>
    {!mock && !managerToken && (revenue
      ? <p>Kết nối mã quản lý ở trang Danh mục để xem doanh thu thật.</p>
      : <form className="query-connect-form" onSubmit={event => {
        event.preventDefault();
        resetResults();
        const form = event.currentTarget;
        setStaffToken(new FormData(form).get('staff-code'));
        form.reset();
      }}>
        <label htmlFor="staff-code">Mã truy cập tra cứu</label>
        <input id="staff-code" name="staff-code" type="password" autoComplete="off" required />
        <button type="submit">Kết nối</button>
      </form>)}
    <form className={revenue ? 'query-form query-form--revenue' : 'query-form'} onSubmit={submit}>
      {revenue ? <>
        <label>Từ ngày<input type="date" required value={dates.from} onChange={event => setDates({ ...dates, from: event.target.value })} /></label>
        <label>Đến trước ngày<input type="date" required value={dates.to} onChange={event => setDates({ ...dates, to: event.target.value })} /></label>
      </> : <>
        <label>Mã hoặc tên<input name="q" value={filters.q} onChange={change} maxLength={150} /></label>
        {[['category_id', 'Danh mục', facets?.categories], ['brand_id', 'Thương hiệu', facets?.brands]].map(([key, label, options]) =>
          <div className="query-field" key={key}><label htmlFor={key}>{label}</label>
          <select id={key} name={key} value={filters[key]} onChange={change}>
            <option value="">Tất cả</option>
            {options?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></div>)}
        <label>Giá tối thiểu<input name="min_price" type="number" min="0" max="999999999999999" value={filters.min_price} onChange={change} /></label>
        <label>Giá tối đa<input name="max_price" type="number" min="0" max="999999999999999" value={filters.max_price} onChange={change} /></label>
        <div className="query-field"><label htmlFor="stock">Tồn kho</label>
        <select id="stock" name="stock" value={filters.stock} onChange={change}>
          <option value="">Tất cả</option><option value="in">Còn hàng</option><option value="out">Hết hàng</option>
        </select></div>
      </>}
      <button className="primary" type="submit" disabled={!canQuery || busy} aria-busy={busy}>
        {revenue ? 'Xem báo cáo' : 'Tìm kiếm'}
      </button>
    </form>
    {busy && <p role="status">Đang tải…</p>}
    {(error || facetError) && <p className="error" role="alert">{error || facetError}</p>}
    {response && revenue && <section aria-label="Kết quả doanh thu">
      <p>Kỳ báo cáo từ <time dateTime={response.from}>{formatDate(response.from)}</time> đến trước <time dateTime={response.to}>{formatDate(response.to)}</time>.</p>
      <h2>{money.format(BigInt(response.revenue_vnd))}</h2>
      <p>{response.order_count} đơn đã xác nhận trong kỳ này.</p>
    </section>}
    {response && !revenue && <>
      {!response.stock_available && <p>Chưa có dữ liệu tồn kho.</p>}
      {response.items.length === 0 ? <p>Không có linh kiện phù hợp.</p> : <div className="query-table"><table>
        <thead><tr>{['Mã', 'Tên', 'Danh mục', 'Thương hiệu', 'Giá bán', 'Tồn'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{response.items.map(item => <tr key={item.id}>
          <td>{item.sku}</td><td>{item.name}</td><td>{item.category_name}</td><td>{item.brand_name}</td>
          <td>{money.format(BigInt(item.selling_price_vnd))}</td><td>{item.quantity_on_hand ?? 'Chưa có'}</td>
        </tr>)}</tbody>
      </table></div>}
      {request.offset > 0 && <button type="button" onClick={() => setRequest({ ...request, offset: request.offset - 25 })}>Trang trước</button>}
      {response.has_more && <button type="button" onClick={() => setRequest({ ...request, offset: request.offset + 25 })}>Trang sau</button>}
    </>}
  </main>;
}
