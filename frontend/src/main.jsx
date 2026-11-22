import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogPage } from './CatalogPage.jsx';
import { catalogRequest } from './catalog-api.js';
import { QueryPage } from './QueryPage.jsx';
import { DocumentsPage } from './DocumentsPage.jsx';
import { ManagedDataPage } from './ManagedDataPage.jsx';
import './styles.css';

const navigation = [
  ['catalog', 'Danh mục'], ['products', 'Linh kiện'], ['suppliers', 'Nhà cung cấp'],
  ['search', 'Tra cứu'], ['purchases', 'Nhập kho'], ['sales', 'Bán hàng'], ['revenue', 'Doanh thu'],
];
const managementTitles = { catalog: 'Danh mục & thương hiệu', products: 'Linh kiện', suppliers: 'Nhà cung cấp' };

function App() {
  const [page, setPage] = useState('catalog');
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const managementTitle = managementTitles[page];

  function disconnect() {
    setToken('');
    setError('');
  }

  async function connect(event) {
    event.preventDefault();
    if (pending.current) return;
    if (!input.trim()) { setError('Nhập mã truy cập quản lý.'); return; }
    pending.current = true; setBusy(true); setError('');
    try { await catalogRequest(input.trim(), 'categories'); setToken(input.trim()); setInput(''); }
    catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <><div className="topbar"><a className="brand" href="/">partstock<span> / quản lý kho</span></a>
    <nav className="app-nav" aria-label="Chức năng">
      {navigation.map(([id, label]) =>
        <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>{label}</button>)}
    </nav></div>
    {page === 'purchases' || page === 'sales' ? <DocumentsPage key={page} kind={page === 'purchases' ? 'purchase' : 'sales'} managerToken={token} />
      : !managementTitle ? <QueryPage key={page} managerToken={token} revenue={page === 'revenue'} />
      : token ? (page === 'catalog' ? <CatalogPage token={token} onDisconnect={disconnect} />
        : <ManagedDataPage key={page} resource={page} token={token} onDisconnect={disconnect} onOpenCatalog={() => setPage('catalog')} />)
      : <main className="connect-card"><h1>{managementTitle}</h1>
        <p>Nhập mã truy cập để mở phiên Quản lý.</p>
        <form onSubmit={connect}><label htmlFor="access-code">Mã truy cập quản lý</label>
          <input id="access-code" type="password" autoComplete="off" value={input} disabled={busy} onChange={event => setInput(event.target.value)} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang kết nối…' : 'Kết nối'}</button></form>
        <p className="hint">Bản dùng thử nội bộ. Mã truy cập chỉ được giữ trong phiên này và mất khi tải lại trang.</p>
      </main>}</>;
}
createRoot(document.getElementById('root')).render(<App />);
