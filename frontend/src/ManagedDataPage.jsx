import React, { useEffect, useRef, useState } from 'react';
import { catalogRequest } from './catalog-api.js';

const errorMessages = {
  SKU_CONFLICT: 'SKU này đã tồn tại. Hãy nhập SKU khác.',
  INVALID_REFERENCE: 'Danh mục hoặc thương hiệu không còn tồn tại. Hãy đóng form và tải lại danh sách.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Hãy kiểm tra lại các trường trong form.',
  PAYLOAD_TOO_LARGE: 'Dữ liệu vượt quá 8 KiB. Hãy rút gọn phần thông số.',
};
const priceFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const productColumns = ['SKU', 'Tên linh kiện', 'Danh mục', 'Thương hiệu', 'Giá bán', 'Trạng thái'];
const supplierColumns = ['Tên nhà cung cấp', 'Điện thoại', 'Email'];

async function loadData(token, resource, signal) {
  const request = path => catalogRequest(token, path, { signal, errorMessages });
  if (resource === 'suppliers') return { rows: await request(resource) };

  const [rows, categories, brands] = await Promise.all([
    request(resource), request('categories'), request('brands'),
  ]);
  return { rows, categories, brands };
}

export function ManagedDataPage({ resource, token, onDisconnect, onOpenCatalog }) {
  const isProduct = resource === 'products';
  const title = isProduct ? 'Linh kiện' : 'Nhà cung cấp';
  const noun = title.toLowerCase();
  const columns = isProduct ? productColumns : supplierColumns;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const addButton = useRef(null);
  const rows = data?.rows ?? [];
  const missingReferences = isProduct && data && (!data.categories.length || !data.brands.length);
  const categoryNames = new Map(data?.categories?.map(({ id, name }) => [id, name]));
  const brandNames = new Map(data?.brands?.map(({ id, name }) => [id, name]));

  useEffect(() => {
    const controller = new AbortController();
    loadData(token, resource, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) { setData(null); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [resource, token, reload]);

  function refresh() {
    setNotice('');
    setError('');
    setLoading(true);
    setReload(value => value + 1);
  }

  function openEditor(event, item = null, discontinuing = false) {
    setNotice('');
    setEditor({ item, discontinuing, opener: event.currentTarget });
  }

  function saved(item) {
    setData(current => ({
      ...current,
      rows: editor.item ? current.rows.map(row => row.id === item.id ? item : row) : [...current.rows, item],
    }));
    setEditor(null);
    if (editor.discontinuing) {
      setNotice(`Đã ngừng kinh doanh ${item.name}.`);
    } else {
      setNotice(editor.item ? 'Đã lưu thay đổi.' : `Đã thêm ${noun}.`);
    }
  }

  return <main className="workspace">
    <header className="page-heading">
      <h1>{title}</h1>
      <button className="quiet" onClick={onDisconnect}>Ngắt kết nối</button>
    </header>
    <div className="table-toolbar">
      <p>{!loading && !error && `${rows.length} ${noun}`}</p>
      <div className="actions">
        <button type="button" onClick={refresh} disabled={loading}>Tải lại</button>
        <button ref={addButton} type="button" className="primary" onClick={openEditor} disabled={loading || Boolean(error) || Boolean(missingReferences)}>
          Thêm {noun}
        </button>
      </div>
    </div>
    {!loading && missingReferences && <p className="managed-reference-hint">
      Thêm ít nhất một danh mục và một thương hiệu để tạo linh kiện.{' '}
      <button type="button" className="quiet" onClick={onOpenCatalog}>Mở Danh mục</button>
    </p>}
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    {loading && <p className="empty" role="status">Đang tải danh sách…</p>}
    {!loading && !error && (rows.length ?
      <div className={`table-wrap managed-table managed-table--${resource}`} role="region" aria-label={`Danh sách ${noun}`} tabIndex={0}>
        <table>
          <caption className="sr-only">Danh sách {noun}</caption>
          <thead><tr>{columns.map(column => <th key={column} scope="col">{column}</th>)}<th scope="col" className="right">Thao tác</th></tr></thead>
          <tbody>{rows.map(item => <tr key={item.id}>
            {isProduct ? <>
              <td>{item.sku}</td>
              <td><span className="item-name">{item.name}</span>
                {item.specifications && <details className="managed-specs">
                  <summary>Thông số</summary><pre>{JSON.stringify(item.specifications, null, 2)}</pre>
                </details>}
              </td>
              <td>{categoryNames.get(item.category_id) ?? item.category_id}</td>
              <td>{brandNames.get(item.brand_id) ?? item.brand_id}</td>
              <td>{priceFormat.format(item.selling_price)}</td>
              <td>{item.status === 'DISCONTINUED' ? 'Ngừng kinh doanh' : 'Đang kinh doanh'}</td>
            </> : <>
              <td className="item-name">{item.name}</td><td>{item.phone ?? '—'}</td><td>{item.email ?? '—'}</td>
            </>}
            <td className="row-actions">
              <button type="button" aria-label={`Sửa ${item.name}`} onClick={event => openEditor(event, item)}>Sửa</button>
              {isProduct && item.status === 'ACTIVE' && <button type="button" className="danger-text"
                aria-label={`Ngừng kinh doanh ${item.name}`} onClick={event => openEditor(event, item, true)}>
                Ngừng kinh doanh
              </button>}
            </td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="empty">Chưa có {noun}.</p>)}
    {editor && <ManagedEditor {...editor} data={data} noun={noun} resource={resource} token={token}
      fallbackFocus={addButton} onClose={() => setEditor(null)} onSaved={saved} />}
  </main>;
}

function initialForm(resource, item) {
  if (resource === 'suppliers') {
    return { name: item?.name ?? '', phone: item?.phone ?? '', email: item?.email ?? '' };
  }
  return {
    name: item?.name ?? '', sku: item?.sku ?? '', category_id: item?.category_id ?? '', brand_id: item?.brand_id ?? '',
    selling_price: item ? String(item.selling_price) : '',
    specifications: item?.specifications ? JSON.stringify(item.specifications, null, 2) : '',
  };
}

function readText(value, label, maxLength, optional = false) {
  const normalized = value.trim().normalize('NFC');
  if (!normalized && !optional) throw new Error(`${label} là bắt buộc.`);
  if ([...normalized].length > maxLength) throw new Error(`${label} tối đa ${maxLength} ký tự.`);
  return normalized || null;
}

function readSpecifications(value) {
  if (!value.trim()) return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Thông số phải là JSON hợp lệ, ví dụ {"capacity_gb": 8}.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Thông số phải là một đối tượng JSON. Để trống nếu không có thông số.');
  }
  return parsed;
}

function readForm(resource, form) {
  const name = readText(form.name, 'Tên', 150);
  if (resource === 'suppliers') {
    return { name, phone: readText(form.phone, 'Điện thoại', 32, true), email: readText(form.email, 'Email', 254, true) };
  }

  const sku = readText(form.sku, 'SKU', 64);
  if (!form.category_id || !form.brand_id) throw new Error('Chọn danh mục và thương hiệu.');
  const price = form.selling_price.trim();
  if (!/^\d+$/.test(price) || Number(price) > 999_999_999_999_999) {
    throw new Error('Giá bán phải là số nguyên từ 0 đến 999.999.999.999.999 VND.');
  }
  return {
    name, sku, category_id: form.category_id, brand_id: form.brand_id,
    selling_price: Number(price), specifications: readSpecifications(form.specifications),
  };
}

function ReferenceSelect({ id, label, items, value, onChange }) {
  return <div>
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={onChange} required>
      <option value="">Chọn {label.toLowerCase()}</option>
      {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </div>;
}

function ManagedEditor({ resource, data, item, discontinuing, noun, token, opener, fallbackFocus, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(resource, item));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const pending = useRef(false);

  useEffect(() => {
    const modal = dialog.current;
    modal.showModal();
    return () => {
      modal.close();
      (opener.isConnected ? opener : fallbackFocus.current)?.focus();
    };
  }, [opener, fallbackFocus]);

  function change(field, event) {
    const value = event.target.value;
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    try {
      const values = discontinuing ? { status: 'DISCONTINUED' } : readForm(resource, form);
      const body = item ? Object.fromEntries(Object.entries(values).filter(([field, value]) =>
        field === 'specifications' ? JSON.stringify(value) !== JSON.stringify(item[field]) : value !== item[field],
      )) : values;
      if (!Object.keys(body).length) throw new Error('Chưa có thay đổi để lưu.');

      pending.current = true;
      setBusy(true);
      const path = item ? `${resource}/${item.id}` : resource;
      const updated = await catalogRequest(token, path, { method: item ? 'PATCH' : 'POST', body, errorMessages });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className="managed-editor" aria-labelledby="managed-editor-title"
    onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <form onSubmit={submit} noValidate>
      <h2 id="managed-editor-title">{discontinuing ? 'Ngừng kinh doanh' : `${item ? 'Sửa' : 'Thêm'} ${noun}`}</h2>
      {discontinuing ? <p>
        Linh kiện <strong>{item.name} ({item.sku})</strong> sẽ không còn chọn được trên phiếu nhập và đơn bán mới.
        Phiếu nhập và đơn bán nháp chứa linh kiện này sẽ không xác nhận được.
        Tồn kho và chứng từ đã xác nhận được giữ nguyên.
      </p> : <fieldset disabled={busy}>
        <label htmlFor="managed-name">Tên</label>
        <input id="managed-name" value={form.name} onChange={event => change('name', event)} required autoFocus />
        {resource === 'products' ? <>
          <label htmlFor="managed-sku">SKU</label>
          <input id="managed-sku" value={form.sku} onChange={event => change('sku', event)} required />
          <div className="managed-references">
            <ReferenceSelect id="managed-category" label="Danh mục" items={data.categories} value={form.category_id} onChange={event => change('category_id', event)} />
            <ReferenceSelect id="managed-brand" label="Thương hiệu" items={data.brands} value={form.brand_id} onChange={event => change('brand_id', event)} />
          </div>
          <label htmlFor="managed-price">Giá bán (VND)</label>
          <input id="managed-price" inputMode="numeric" value={form.selling_price} onChange={event => change('selling_price', event)} required />
          <label htmlFor="managed-specs">Thông số (tùy chọn)</label>
          <textarea id="managed-specs" rows={4} spellCheck={false} aria-describedby="managed-specs-hint"
            value={form.specifications} onChange={event => change('specifications', event)} />
          <p id="managed-specs-hint" className="hint">Ví dụ <code>{'{"capacity_gb": 8}'}</code>. Để trống để bỏ thông số.</p>
        </> : <>
          <label htmlFor="managed-phone">Điện thoại (tùy chọn)</label>
          <input id="managed-phone" type="tel" value={form.phone} onChange={event => change('phone', event)} />
          <label htmlFor="managed-email">Email (tùy chọn)</label>
          <input id="managed-email" type="email" value={form.email} onChange={event => change('email', event)} />
        </>}
      </fieldset>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="dialog-actions">
        <button type="button" onClick={onClose} disabled={busy} autoFocus={discontinuing}>Hủy</button>
        <button type="submit" className={discontinuing ? 'danger' : 'primary'} disabled={busy}>
          {busy ? 'Đang lưu…' : discontinuing ? 'Ngừng kinh doanh' : 'Lưu'}
        </button>
      </div>
    </form>
  </dialog>;
}
