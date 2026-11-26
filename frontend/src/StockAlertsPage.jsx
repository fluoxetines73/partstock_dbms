import React, { useEffect, useState } from 'react';
import { catalogRequest } from './catalog-api.js';

const errorMessages = {
  VALIDATION_ERROR: 'Ngưỡng tồn phải là số nguyên từ 0 đến 2147483647.',
  NOT_FOUND: 'Không tìm thấy linh kiện hoặc dòng tồn kho. Hãy tải lại danh sách.',
};

export function StockAlertsPage({ managerToken }) {
  const [staffToken, setStaffToken] = useState('');
  const token = managerToken || staffToken;

  return <main className="workspace">
    <header className="page-heading">
      <h1>Cảnh báo tồn kho</h1>
      {staffToken && <button type="button" onClick={() => setStaffToken('')}>Ngắt kết nối</button>}
    </header>
    {token ? <StockAlerts key={token} token={token} canEdit={Boolean(managerToken)} /> :
      <form className="query-connect-form" onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget;
        setStaffToken(new FormData(form).get('staff-code').trim());
        form.reset();
      }}>
        <label htmlFor="alert-access">Mã truy cập nhân viên</label>
        <input id="alert-access" name="staff-code" type="password" autoComplete="off" required />
        <button type="submit">Kết nối</button>
      </form>}
  </main>;
}

function StockAlerts({ token, canEdit }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const get = path => catalogRequest(token, path, { signal: controller.signal, errorMessages });
    Promise.all([get('stock-alerts'), canEdit ? get('products') : []])
      .then(([groups, products]) => {
        if (controller.signal.aborted) return;
        setData({ ...groups, products });
      })
      .catch(err => { if (!controller.signal.aborted) { setData(null); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, canEdit, reload]);

  const product = data?.products.find(p => p.id === selected);
  const value = input ?? String(product?.low_threshold ?? '');

  function refresh() {
    setLoading(true);
    setInput(null);
    setError('');
    setReload(n => n + 1);
  }

  async function save(event) {
    event.preventDefault();
    if (!product || saving || loading) return;
    const threshold = value === '' ? null : Number(value);
    if (threshold !== null && (!Number.isInteger(threshold) || threshold < 0 || threshold > 2147483647)) {
      setError(errorMessages.VALIDATION_ERROR);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await catalogRequest(token, `products/${product.id}/low-threshold`, {
        method: 'PUT', body: { low_threshold: threshold }, errorMessages,
      });
      setNotice(threshold === null ? 'Đã bỏ ngưỡng.' : 'Đã lưu ngưỡng.');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="actions"><button type="button" disabled={loading || saving} onClick={() => { setNotice(''); refresh(); }}>Tải lại</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p role="status">Đang tải tồn kho…</p> : notice && <p role="status">{notice}</p>}
    {!loading && data && <>
      {canEdit && <form className="query-form" onSubmit={save}>
        <label>Chọn linh kiện<select value={product?.id ?? ''} disabled={saving} onChange={event => {
          setSelected(event.target.value); setInput(null); setError(''); setNotice('');
        }}>
          <option value="">Chọn linh kiện</option>
          {data.products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
        </select></label>
        <label>Ngưỡng tồn kho<input type="number" min="0" max="2147483647" step="1" value={value}
          placeholder="Để trống để bỏ ngưỡng" disabled={!product || saving} onChange={event => {
            setInput(event.target.value); setNotice(''); setError('');
          }} /></label>
        <button type="submit" className="primary" disabled={!product || saving}>Lưu ngưỡng</button>
      </form>}
      <StockTable title="Dưới ngưỡng" rows={data.alerts} showThreshold />
      <StockTable title="Chưa cấu hình ngưỡng" rows={data.unconfigured} />
    </>}
  </>;
}

function StockTable({ title, rows, showThreshold }) {
  return <section aria-label={title}>
    <h2>{title}</h2>
    {rows.length ? <div className="table-wrap"><table>
      <thead><tr>{['SKU', 'Tên linh kiện', 'Tồn hiện tại', ...(showThreshold ? ['Ngưỡng'] : [])].map(label =>
        <th scope="col" key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.product_id}>
        <td>{row.sku}</td><td>{row.name}</td><td>{row.quantity_on_hand}</td>
        {showThreshold && <td>{row.low_threshold}</td>}
      </tr>)}</tbody>
    </table></div> : <p>{showThreshold ? 'Không có linh kiện dưới ngưỡng.' : 'Không có linh kiện thiếu ngưỡng.'}</p>}
  </section>;
}
