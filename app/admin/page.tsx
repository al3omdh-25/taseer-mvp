'use client';
// app/admin/page.tsx — Admin dashboard (token-protected)
import { useState, useEffect, useCallback } from 'react';
import type { AdminOverview, Request, Supplier, Payment } from '@/types';

const TOKEN_KEY = 'taseer_admin_token';

// ── Login gate ────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken]   = useState('');
  const [error, setError]   = useState('');
  const [busy,  setBusy]    = useState(false);

  const login = async () => {
    if (!token.trim()) { setError('أدخل رمز الوصول'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin?type=overview', { headers: { 'x-admin-token': token } });
      if (!res.ok) throw new Error('رمز الوصول غير صحيح');
      sessionStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطأ في المصادقة');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128272;</div>
        <div className="auth-title">لوحة الإدارة</div>
        <div className="auth-subtitle">أدخل رمز الوصول للمتابعة</div>
        <input
          className="form-input"
          type="password"
          placeholder="رمز الوصول"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ marginBottom: 14, direction: 'ltr', textAlign: 'center', letterSpacing: 2 }}
        />
        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}
        <button className="btn btn-primary btn-full" onClick={login} disabled={busy}>
          {busy ? 'جارٍ التحقق...' : 'دخول'}
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
          رمز التطوير الافتراضي:&nbsp;
          <code style={{ direction: 'ltr', display: 'inline-block', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>
            taseer-admin-dev
          </code>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────
type Section = 'overview' | 'requests' | 'suppliers' | 'offers' | 'payments';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview',  label: 'نظرة عامة', icon: '📊' },
  { id: 'requests',  label: 'الطلبات',   icon: '📋' },
  { id: 'suppliers', label: 'الموردون',  icon: '🏪' },
  { id: 'offers',    label: 'العروض',    icon: '💰' },
  { id: 'payments',  label: 'المدفوعات', icon: '💳' },
];

const SL: Record<string, string> = {
  active: 'نشط', closed: 'مغلق', expired: 'منتهي',
  paid: 'مدفوع', pending: 'معلق', failed: 'فشل', refunded: 'مسترد',
};

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section,   setSection]   = useState<Section>('overview');
  const [overview,  setOverview]  = useState<AdminOverview | null>(null);
  const [rows,      setRows]      = useState<unknown[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(async (s: Section) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/admin?type=${s}`, { headers: { 'x-admin-token': token } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (s === 'overview') setOverview(data as AdminOverview);
      else setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل البيانات');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(section); }, [section, load]);

  const changeSection = (s: Section) => { setSection(s); setRows([]); };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <a href="/" className="admin-logo">تسعير</a>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`admin-nav-item${section === n.id ? ' active' : ''}`}
            onClick={() => changeSection(n.id)}
          >
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
        <div style={{ marginTop: 24 }}>
          <button className="admin-nav-item" onClick={onLogout} style={{ color: 'rgba(255,255,255,.45)' }}>
            <span>&#128682;</span>خروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-section-title">
          {NAV.find(n => n.id === section)?.icon}&nbsp;
          {NAV.find(n => n.id === section)?.label}
        </div>

        {loading && <div className="loading-wrap"><div className="spinner" />تحميل...</div>}
        {error   && <div className="error-box">{error}</div>}

        {/* Overview KPIs */}
        {section === 'overview' && overview && !loading && (
          <div className="kpi-grid">
            {[
              { num: overview.active_requests,                   label: 'طلب نشط'            },
              { num: overview.total_requests,                    label: 'إجمالي الطلبات'       },
              { num: overview.active_suppliers,                  label: 'مورد نشط'            },
              { num: overview.total_suppliers,                   label: 'إجمالي الموردين'      },
              { num: overview.total_offers,                      label: 'إجمالي العروض'        },
              { num: overview.total_payments,                    label: 'عملية دفع'           },
              { num: `${overview.total_revenue_sar.toFixed(2)} ر.س`, label: 'إجمالي الإيرادات' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-number">{k.num}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Requests table */}
        {section === 'requests' && !loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>رمز الطلب</th><th>العنوان</th><th>الفئة</th><th>المدينة</th><th>الحالة</th><th>التاريخ</th>
              </tr></thead>
              <tbody>
                {(rows as Request[]).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--teal)', fontWeight: 600, direction: 'ltr' }}>{r.request_code}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                    <td>{r.category_id}</td>
                    <td>{r.city}</td>
                    <td><span className={`status-badge status-${r.status}`}>{SL[r.status] ?? r.status}</span></td>
                    <td style={{ direction: 'ltr', fontSize: 12, color: 'var(--muted)' }}>{new Date(r.created_at).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Suppliers table */}
        {section === 'suppliers' && !loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>الاسم</th><th>المدينة</th><th>الفئة</th><th>النوع</th><th>موثوق</th><th>الحالة</th><th>التاريخ</th>
              </tr></thead>
              <tbody>
                {(rows as Supplier[]).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.city}</td><td>{s.category_id}</td><td>{s.supplier_type}</td>
                    <td>{s.is_trusted ? '⭐' : '—'}</td>
                    <td><span className={`status-badge ${s.is_active ? 'status-active' : 'status-closed'}`}>{s.is_active ? 'نشط' : 'موقوف'}</span></td>
                    <td style={{ direction: 'ltr', fontSize: 12, color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Offers table */}
        {section === 'offers' && !loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>رمز الطلب</th><th>المورد</th><th>السعر</th><th>المنشأ</th><th>الضمان</th><th>توصيل</th><th>الحالة</th>
              </tr></thead>
              <tbody>
                {(rows as Record<string, unknown>[]).map(o => (
                  <tr key={o.id as string}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--teal)', direction: 'ltr' }}>
                      {((o.requests as Record<string,unknown>)?.request_code as string) ?? '—'}
                    </td>
                    <td>{((o.suppliers as Record<string,unknown>)?.name as string) ?? '—'}</td>
                    <td style={{ fontWeight: 700 }}>{Number(o.price).toLocaleString()} ر.س</td>
                    <td>{o.origin as string}</td>
                    <td>{(o.warranty as string) ?? '—'}</td>
                    <td>{o.delivery ? '✅' : '❌'}</td>
                    <td><span className={`status-badge status-${o.status}`}>{SL[o.status as string] ?? (o.status as string)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments table */}
        {section === 'payments' && !loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr>
                <th>رمز الطلب</th><th>الباقة</th><th>المبلغ</th><th>وسيلة الدفع</th><th>معرف مويصر</th><th>الحالة</th><th>التاريخ</th>
              </tr></thead>
              <tbody>
                {(rows as (Payment & { requests?: { request_code: string } })[]).map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--teal)', direction: 'ltr' }}>{p.requests?.request_code ?? '—'}</td>
                    <td>{p.package_type}</td>
                    <td style={{ fontWeight: 700 }}>{Number(p.amount_sar).toFixed(2)} ر.س</td>
                    <td>{p.payment_method ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, direction: 'ltr' }}>
                      {p.moyasar_id ? p.moyasar_id.slice(0, 14) + '...' : '—'}
                    </td>
                    <td><span className={`status-badge status-${p.status}`}>{SL[p.status] ?? p.status}</span></td>
                    <td style={{ direction: 'ltr', fontSize: 12, color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && section !== 'overview' && rows.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">&#128228;</div>
            <div className="empty-state-text">لا توجد بيانات بعد</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem(TOKEN_KEY);
    if (s) setToken(s);
  }, []);

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <AdminDashboard
      token={token}
      onLogout={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); }}
    />
  );
}
