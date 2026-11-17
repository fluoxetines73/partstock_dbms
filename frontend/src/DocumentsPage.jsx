import React, { useCallback, useEffect, useRef, useState } from 'react';
import { documentRequest } from './documents-api.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const vnd = value => money.format(BigInt(value ?? 0));
const when = value => (value ? value.slice(0, 16) : '—');
const statusLabel = { DRAFT: 'Nháp', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy' };

const kinds = {
  purchase: {
    resource: 'purchase-receipts', title: 'Phiếu nhập kho', eyebrow: 'UC04 • NHẬP KHO', create: 'Tạo phiếu nhập',
    confirm: 'Xác nhận nhập kho', hasCost: true, statuses: ['DRAFT', 'CONFIRMED'],
    done: 'Đã xác nhận phiếu nhập và cộng tồn kho.', totalField: 'total_cost_vnd', lineMoney: 'unit_cost_vnd', moneyLabel: 'Giá nhập',
  },
  sales: {
    resource: 'sales-orders', title: 'Đơn bán hàng', eyebrow: 'UC07–08 • BÁN HÀNG', create: 'Tạo đơn bán',
    confirm: 'Xác nhận bán', hasCost: false, statuses: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
    done: 'Đã xác nhận đơn và trừ tồn kho.', totalField: 'total_vnd', lineMoney: 'unit_price_vnd', moneyLabel: 'Giá bán',
  },
};

let lineKey = 0;
const blankLine = () => ({ key: ++lineKey, product_id: '', quantity: '1', unit_cost: '' });
const blankForm = () => ({ party: '', note: '', lines: [blankLine()] });

function formFrom(kind, doc) {
  return {
    party: kind === 'purchase' ? doc.supplier_id : doc.customer_name ?? '',
    note: doc.note ?? '',
    lines: doc.lines.length === 0 ? [blankLine()] : doc.lines.map(line => ({
      key: ++lineKey, product_id: line.product_id, quantity: String(line.quantity),
      unit_cost: kind === 'purchase' ? line.unit_cost_vnd : '',
    })),
  };
}

function bodyFrom(kind, form) {
  const parsed = form.lines.filter(line => line.product_id).map(line => {
    const quantity = Number(line.quantity);
    const base = { product_id: line.product_id, quantity };
    if (!line.product_id || !Number.isInteger(quantity) || quantity < 1) throw new Error('Mỗi dòng cần chọn sản phẩm và số lượng nguyên từ 1 trở lên.');
    if (kind !== 'purchase') return base;
    const unitCost = Number(line.unit_cost);
    if (line.unit_cost === '' || !Number.isInteger(unitCost) || unitCost < 0) throw new Error('Mỗi dòng cần giá nhập là số nguyên từ 0 trở lên.');
    return { ...base, unit_cost: unitCost };
  });
  if (new Set(parsed.map(line => line.product_id)).size !== parsed.length) throw new Error('Mỗi sản phẩm chỉ xuất hiện một dòng. Hãy gộp số lượng.');
  if (kind === 'purchase') {
    if (!form.party) throw new Error('Chọn nhà cung cấp.');
    return { supplier_id: form.party, note: form.note, lines: parsed };
  }
  return { customer_name: form.party, note: form.note, lines: parsed };
}

export function DocumentsPage({ kind, managerToken }) {
  const cfg = kinds[kind];
  const [entered, setEntered] = useState('');
  const token = managerToken || entered;
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [armed, setArmed] = useState('');
  const [reason, setReason] = useState('');
  const pending = useRef(false);

  const loadList = useCallback(async signal => {
    const query = filter ? `?status=${filter}` : '';
    setList(await documentRequest(token, cfg.resource + query, { signal }));
  }, [token, cfg.resource, filter]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadList(controller.signal).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [token, loadList]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    documentRequest(token, 'product-search?limit=100', { signal: controller.signal })
      .then(result => setProducts(result.items))
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    if (kind === 'purchase') {
      documentRequest(token, `${cfg.resource}/suppliers`, { signal: controller.signal })
        .then(setSuppliers)
        .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    }
    return () => controller.abort();
  }, [token, kind, cfg.resource]);

  // One request at a time: a double click can never send a second confirm/cancel.
  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function show(doc) {
    setCurrent(doc);
    setArmed('');
    setReason('');
    if (doc.status === 'DRAFT') setForm(formFrom(kind, doc));
  }

  const open = id => run(async () => show(await documentRequest(token, `${cfg.resource}/${id}`)));

  function startNew() {
    setCurrent('new');
    setForm(blankForm());
    setArmed('');
    setError('');
    setNotice('');
  }

  async function save() {
    const body = bodyFrom(kind, form);
    const saved = current === 'new'
      ? await documentRequest(token, cfg.resource, { method: 'POST', body })
      : await documentRequest(token, `${cfg.resource}/${current.id}`, { method: 'PUT', body });
    setCurrent(saved);
    return saved;
  }

  const saveDraft = () => run(async () => {
    const saved = await save();
    show(saved);
    setNotice(`Đã lưu nháp ${saved.code}. Tồn kho chưa thay đổi.`);
    await loadList();
  });

  const confirmDraft = () => run(async () => {
    const saved = await save();
    try {
      show(await documentRequest(token, `${cfg.resource}/${saved.id}/confirm`, { method: 'POST' }));
      setNotice(cfg.done);
    } catch (err) {
      show(saved);
      throw err;
    } finally {
      await loadList().catch(() => {});
      documentRequest(token, 'product-search?limit=100').then(result => setProducts(result.items)).catch(() => {});
    }
  });

  const removeDraft = () => run(async () => {
    await documentRequest(token, `${cfg.resource}/${current.id}`, { method: 'DELETE' });
    setCurrent(null);
    setArmed('');
    setNotice('Đã xóa bản nháp. Tồn kho không thay đổi.');
    await loadList();
  });

  const cancelOrder = event => {
    event.preventDefault();
    return run(async () => {
      show(await documentRequest(token, `${cfg.resource}/${current.id}/cancel`, { method: 'POST', body: { reason } }));
      setNotice('Đã hủy đơn và hoàn tồn kho.');
      await loadList();
      documentRequest(token, 'product-search?limit=100').then(result => setProducts(result.items)).catch(() => {});
    });
  };

  const setLine = (key, patch) => setForm(f => ({ ...f, lines: f.lines.map(line => (line.key === key ? { ...line, ...patch } : line)) }));
  const draft = current === 'new' || current?.status === 'DRAFT';
  const productOptions = [...products];
  if (current && current !== 'new') {
    for (const line of current.lines) {
      if (!productOptions.some(product => product.id === line.product_id)) {
        productOptions.push({ id: line.product_id, sku: line.sku, name: line.name, quantity_on_hand: null });
      }
    }
  }

  if (!token) {
    return <main className="query-page">
      <h1>{cfg.title}</h1>
      <p>Kết nối mã quản lý ở trang Danh mục, hoặc nhập mã truy cập của nhân viên.</p>
      <form className="query-connect-form" onSubmit={event => {
        event.preventDefault();
        const form = event.currentTarget;
        setEntered(String(new FormData(form).get('doc-code') ?? '').trim());
        form.reset();
      }}>
        <label htmlFor="doc-code">Mã truy cập (nhân viên hoặc quản lý)</label>
        <input id="doc-code" name="doc-code" type="password" autoComplete="off" required />
        <button className="primary" type="submit">Kết nối</button>
      </form>
    </main>;
  }

  return <main className="query-page documents">
    <p className="eyebrow">{cfg.eyebrow}</p>
    <h1>{cfg.title}</h1>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}

    <div className="table-toolbar">
      <div className="query-field"><label htmlFor="doc-filter">Lọc theo trạng thái</label>
        <select id="doc-filter" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="">Tất cả</option>
          {cfg.statuses.map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}
        </select></div>
      <button className="primary" type="button" onClick={startNew} disabled={busy}>{cfg.create}</button>
    </div>

    {list === null ? <p role="status">Đang tải…</p> : list.length === 0 ? <p>Chưa có chứng từ phù hợp.</p>
      : <div className="query-table"><table>
        <thead><tr>{['Mã', 'Trạng thái', kind === 'purchase' ? 'Nhà cung cấp' : 'Khách hàng', 'Số dòng', 'Tổng tiền', 'Xác nhận lúc', ''].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{list.map(item => <tr key={item.id}>
          <td>{item.code}</td><td>{statusLabel[item.status]}</td>
          <td>{kind === 'purchase' ? item.supplier_name : item.customer_name ?? '—'}</td>
          <td>{item.line_count}</td><td>{vnd(item[cfg.totalField])}</td><td>{when(item.confirmed_at)}</td>
          <td><button type="button" disabled={busy} onClick={() => open(item.id)} aria-label={`Mở ${item.code}`}>Mở</button></td>
        </tr>)}</tbody>
      </table></div>}

    {current && <section className="document-panel" aria-label="Chi tiết chứng từ">
      <h2>{current === 'new' ? cfg.create : `${current.code} · ${statusLabel[current.status]}`}</h2>
      {draft ? <form onSubmit={event => { event.preventDefault(); saveDraft(); }}>
        <div className="query-form">
          {kind === 'purchase'
            ? <div className="query-field"><label htmlFor="doc-party">Nhà cung cấp</label>
              <select id="doc-party" value={form.party} onChange={event => setForm({ ...form, party: event.target.value })}>
                <option value="">Chọn nhà cung cấp</option>
                {suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></div>
            : <label>Tên khách (tùy chọn)<input value={form.party} maxLength={150} onChange={event => setForm({ ...form, party: event.target.value })} /></label>}
          <label>Ghi chú<input value={form.note} maxLength={500} onChange={event => setForm({ ...form, note: event.target.value })} /></label>
        </div>
        <div className="query-table"><table>
          <thead><tr><th scope="col">Sản phẩm</th><th scope="col">Số lượng</th>{cfg.hasCost && <th scope="col">{cfg.moneyLabel} (VND)</th>}<th scope="col"><span className="sr-only">Xóa dòng</span></th></tr></thead>
          <tbody>{form.lines.map((line, index) => <tr key={line.key}>
            <td><select aria-label={`Sản phẩm dòng ${index + 1}`} value={line.product_id} onChange={event => setLine(line.key, { product_id: event.target.value })}>
              <option value="">Chọn sản phẩm</option>
              {productOptions.map(product => <option key={product.id} value={product.id}>
                {product.sku} — {product.name}{product.quantity_on_hand == null ? '' : ` (tồn ${product.quantity_on_hand})`}</option>)}
            </select></td>
            <td><input aria-label={`Số lượng dòng ${index + 1}`} type="number" min="1" step="1" value={line.quantity} onChange={event => setLine(line.key, { quantity: event.target.value })} /></td>
            {cfg.hasCost && <td><input aria-label={`Giá nhập dòng ${index + 1}`} type="number" min="0" step="1" value={line.unit_cost} onChange={event => setLine(line.key, { unit_cost: event.target.value })} /></td>}
            <td><button type="button" className="quiet danger-text" aria-label={`Xóa dòng ${index + 1}`}
              onClick={() => setForm(f => ({ ...f, lines: f.lines.length > 1 ? f.lines.filter(item => item.key !== line.key) : [blankLine()] }))}>Xóa</button></td>
          </tr>)}</tbody>
        </table></div>
        {!cfg.hasCost && <p className="hint">Giá bán hiện hành được hiển thị sau khi lưu; giá chốt khi xác nhận đơn.</p>}
        <div className="actions">
          <button type="button" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, blankLine()] }))}>Thêm dòng</button>
          <button type="submit" disabled={busy}>Lưu nháp</button>
          <button type="button" className="primary" disabled={busy} onClick={confirmDraft}>{cfg.confirm}</button>
          {current !== 'new' && (armed === 'delete'
            ? <button type="button" className="danger" disabled={busy} onClick={removeDraft}>Xác nhận xóa nháp</button>
            : <button type="button" className="quiet danger-text" disabled={busy} onClick={() => setArmed('delete')}>Xóa nháp</button>)}
        </div>
      </form> : <>
        <p>{kind === 'purchase' ? `Nhà cung cấp: ${current.supplier_name}` : `Khách hàng: ${current.customer_name ?? '—'}`}
          {current.note ? ` · Ghi chú: ${current.note}` : ''}</p>
        <p>Xác nhận lúc {when(current.confirmed_at)}{current.status === 'CANCELLED' ? ` · Hủy lúc ${when(current.cancelled_at)} · Lý do: ${current.cancel_reason}` : ''}</p>
        <div className="query-table"><table>
          <thead><tr>{['Sản phẩm', 'Số lượng', cfg.moneyLabel].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{current.lines.map(line => <tr key={line.id}>
            <td>{line.sku} — {line.name}</td><td>{line.quantity}</td><td>{vnd(line[cfg.lineMoney])}</td></tr>)}</tbody>
        </table></div>
        <p><strong>Tổng: {vnd(current[cfg.totalField])}</strong></p>
        {kind === 'sales' && current.status === 'CONFIRMED' && <form className="query-form" onSubmit={cancelOrder}>
          <label>Lý do hủy (bắt buộc)<input value={reason} maxLength={500} required onChange={event => setReason(event.target.value)} /></label>
          <button type="submit" className="danger" disabled={busy || !reason.trim()}>Hủy đơn và hoàn kho</button>
        </form>}
      </>}
    </section>}
  </main>;
}
