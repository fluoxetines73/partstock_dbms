import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogPage } from './CatalogPage.jsx';
import { catalogRequest } from './catalog-api.js';
import { QueryPage } from './QueryPage.jsx';
import './styles.css';

function App() {
  const [page, setPage] = useState('catalog');
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
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
      {[['catalog', 'Danh mục'], ['search', 'Tra cứu'], ['revenue', 'Doanh thu']].map(([id, label]) =>
        <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}>{label}</button>)}
    </nav></div>
    {page !== 'catalog' ? <QueryPage key={page} managerToken={token} revenue={page === 'revenue'} />
      : token ? <CatalogPage token={token} onDisconnect={() => { setToken(''); setError(''); }} />
      : <main className="connect-card"><p className="eyebrow">PARTSTOCK • NỘI BỘ</p><h1>Sẵn sàng quản lý<br />danh mục linh kiện.</h1>
        <p>Kết nối phiên quản lý để xem danh mục và thương hiệu.</p>
        <form onSubmit={connect}><label htmlFor="access-code">Mã truy cập quản lý</label>
          <input id="access-code" type="password" autoComplete="off" value={input} disabled={busy} onChange={event => setInput(event.target.value)} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Đang kết nối…' : 'Kết nối'}</button></form>
        <p className="hint">Bản dùng thử nội bộ. Mã truy cập chỉ được giữ trong phiên này và mất khi tải lại trang.</p>
      </main>}</>;
}
createRoot(document.getElementById('root')).render(<App />);
