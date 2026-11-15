import React, { useEffect, useRef, useState } from 'react';
import { catalogRequest } from './catalog-api.js';

// C can mount this module inside the shared shell; authorization remains at the API.
export function CatalogPage({ token, onDisconnect }) {
  const [table, setTable] = useState('categories');
  const tabs = [['categories', 'Danh mục'], ['brands', 'Thương hiệu']];
  return <main className="workspace">
    <header className="page-heading"><div><p className="eyebrow">DỮ LIỆU SẢN PHẨM</p><h1>Danh mục & thương hiệu</h1>
      <p>Giữ danh sách gọn gàng, để quản lý linh kiện dễ dàng hơn.</p></div>
      <button className="quiet" onClick={onDisconnect}>Ngắt kết nối</button></header>
    <div className="tabs" role="tablist" aria-label="Loại dữ liệu">
      {tabs.map(([key, label], index) => <button key={key} id={`tab-${key}`} role="tab" aria-controls="catalog-panel" aria-selected={key === table}
        tabIndex={key === table ? 0 : -1} onClick={() => setTable(key)} onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
            setTable(tabs[next][0]); document.getElementById(`tab-${tabs[next][0]}`).focus();
          }
        }}>{label}</button>)}
    </div>
    <CatalogList key={table} table={table} token={token} />
  </main>;
}

function CatalogList({ table, token }) {
  const noun = table === 'categories' ? 'danh mục' : 'thương hiệu';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    catalogRequest(token, table, { signal: controller.signal }).then(rows => {
      if (!controller.signal.aborted) setItems(rows);
    }).catch(err => { if (!controller.signal.aborted) { setItems([]); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [table, token, reload]);
  function saved(mode, item) {
    setItems(previous => mode === 'delete' ? previous.filter(row => row.id !== item.id)
      : mode === 'edit' ? previous.map(row => row.id === item.id ? item : row) : [...previous, item]);
    setEditor(null); setNotice(mode === 'delete' ? 'Đã xóa mục.' : 'Đã lưu thay đổi.');
  }
  return <section id="catalog-panel" role="tabpanel" aria-labelledby={`tab-${table}`}>
    <div className="table-toolbar"><div><h2>{table === 'categories' ? 'Danh mục linh kiện' : 'Thương hiệu linh kiện'}</h2>
      <p>{loading ? 'Đang tải danh sách…' : error ? 'Chưa tải được danh sách' : `${items.length} ${noun}`}</p></div>
      <div className="actions"><button onClick={() => { setNotice(''); setReload(n => n + 1); }} disabled={loading}>Tải lại</button>
        <button className="primary" onClick={() => { setNotice(''); setEditor({ mode: 'add' }); }} disabled={loading || Boolean(error)}>Thêm {noun}</button></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
    <div className="table-wrap" aria-busy={loading}>
      <table><caption className="sr-only">Danh sách {noun}</caption><thead><tr><th scope="col">Tên {noun}</th><th scope="col" className="right">Thao tác</th></tr></thead>
        <tbody>{!loading && items.map(item => <tr key={item.id}><td><span className="item-name">{item.name}</span></td><td className="row-actions">
          <button onClick={() => { setNotice(''); setEditor({ mode: 'edit', item }); }}>Sửa</button>
          <button className="danger-text" onClick={() => { setNotice(''); setEditor({ mode: 'delete', item }); }}>Xóa</button>
        </td></tr>)}</tbody></table>
      {loading ? <p className="empty" role="status">Đang tải…</p> : !error && items.length === 0 && <div className="empty"><strong>Chưa có {noun}</strong><p>Thêm mục đầu tiên để bắt đầu phân loại linh kiện.</p></div>}
    </div>
    <p className="hint">Chỉ xóa được mục chưa có sản phẩm sử dụng. Đổi tên không làm mất liên kết sản phẩm.</p>
    {editor && <CatalogEditor {...editor} noun={noun} token={token} table={table} onClose={() => setEditor(null)} onSaved={saved} />}
  </section>;
}

function CatalogEditor({ mode, item, noun, token, table, onClose, onSaved }) {
  const dialog = useRef(null);
  const pending = useRef(false);
  const [name, setName] = useState(item?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    const normalized = name.trim().normalize('NFC');
    if (mode !== 'delete' && ([...normalized].length < 1 || [...normalized].length > 100)) {
      setError('Tên phải có từ 1 đến 100 ký tự.'); return;
    }
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await catalogRequest(token, mode === 'add' ? table : `${table}/${item.id}`, {
        method: mode === 'add' ? 'POST' : mode === 'edit' ? 'PATCH' : 'DELETE',
        body: mode === 'delete' ? undefined : { name: normalized },
      });
      onSaved(mode, result || item);
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="editor-title" onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <form onSubmit={submit}>
      <h2 id="editor-title">{mode === 'delete' ? 'Xóa' : mode === 'edit' ? 'Sửa' : 'Thêm'} {noun}</h2>
      {mode === 'delete' ? <p>Bạn muốn xóa <strong>{item.name}</strong>? Thao tác này không thể hoàn tác.</p>
        : <><label htmlFor="catalog-name">Tên</label><input id="catalog-name" autoFocus value={name} onChange={event => setName(event.target.value)} disabled={busy} aria-describedby="name-hint" />
          <p id="name-hint" className="hint">Từ 1 đến 100 ký tự. Tên không được trùng trong cùng danh sách.</p></>}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="dialog-actions"><button type="button" autoFocus={mode === 'delete'} disabled={busy} onClick={onClose}>Hủy</button>
        <button type="submit" className={mode === 'delete' ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Đang lưu…' : mode === 'delete' ? 'Xóa' : 'Lưu'}</button></div>
    </form>
  </dialog>;
}
