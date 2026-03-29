'use client';
// app/supplier/page.tsx — Supplier registration + dashboard
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import type { SupplierType, Request } from '@/types';

const CATEGORIES = [
  { id: 'home',     label: 'الأجهزة المنزلية والتكييف', icon: '❄️' },
  { id: 'building', label: 'مواد البناء',               icon: '🏗️' },
  { id: 'elec',     label: 'الإلكترونيات',              icon: '📱' },
  { id: 'services', label: 'خدمات المنازل',             icon: '🔧' },
  { id: 'furn',     label: 'الأثاث والمفروشات',         icon: '🛋️' },
  { id: 'cars',     label: 'قطع غيار السيارات',         icon: '🚗' },
  { id: 'other',    label: 'طلبات أخرى',                icon: '📦' },
];

const CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','أبها','تبوك','بريدة','حائل','جيزان','نجران','الطائف','ينبع'];
const ORIGINS = ['المملكة العربية السعودية','الصين','ألمانيا','اليابان','الولايات المتحدة','كوريا','الإمارات','تركيا'];
const SUPPLIER_TYPES: { value: SupplierType; label: string }[] = [
  { value: 'company', label: 'شركة' },
  { value: 'store',   label: 'متجر' },
  { value: 'trader',  label: 'تاجر' },
  { value: 'agent',   label: 'وكيل' },
];
const CAT_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));

// ── Registration form ─────────────────────────────────────
function RegisterForm({ onRegistered }: { onRegistered: (id: string) => void }) {
  const [form, setForm] = useState({ name: '', city: '', phone: '', whatsapp: '', category_id: '', supplier_type: 'store' as SupplierType });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.city || !form.phone || !form.category_id) {
      setError('يرجى ملء جميع الحقول المطلوبة'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, whatsapp: form.whatsapp || form.phone }),
      });
      const data = await res.json() as { supplier_id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'فشل التسجيل');
      localStorage.setItem('taseer_supplier_id', data.supplier_id!);
      onRegistered(data.supplier_id!);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '36px 16px', flex: 1 }}>
      <div className="auth-card">
        <Link href="/" className="back-link">&#8594; رجوع للرئيسية</Link>
        <div className="auth-title">تسجيل المورد</div>
        <div className="auth-subtitle">انضم وابدأ استقبال طلبات التسعير من المشترين</div>

        <div className="form-group">
          <label className="form-label">اسم الشركة / المؤسسة *</label>
          <input className="form-input" placeholder="مؤسسة النخبة التجارية" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">المدينة *</label>
            <select className="form-select" value={form.city} onChange={e => set('city', e.target.value)}>
              <option value="">-- اختر --</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">نوع المورد *</label>
            <select className="form-select" value={form.supplier_type} onChange={e => set('supplier_type', e.target.value as SupplierType)}>
              {SUPPLIER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">رقم الجوال *</label>
            <input className="form-input" placeholder="05xxxxxxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">رقم واتساب</label>
            <input className="form-input" placeholder="05xxxxxxxx" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">الفئة الرئيسية *</label>
          <select className="form-select" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">-- اختر الفئة --</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }} onClick={submit} disabled={loading}>
          {loading ? 'جارٍ التسجيل...' : 'تسجيل والدخول ←'}
        </button>
      </div>
    </div>
  );
}

// ── Offer submission form ─────────────────────────────────
function OfferForm({ requestId, supplierId, onDone }: { requestId: string; supplierId: string; onDone: () => void }) {
  const [form, setForm] = useState({ price: '', city: CITIES[0], origin: ORIGINS[0], warranty: '', delivery: 'yes', delivery_days: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.price) { setError('السعر مطلوب'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id:   requestId,
          supplier_id:  supplierId,
          price:        parseFloat(form.price),
          city:         form.city,
          origin:       form.origin,
          warranty:     form.warranty || undefined,
          delivery:     form.delivery === 'yes',
          delivery_days: form.delivery === 'yes' && form.delivery_days ? parseInt(form.delivery_days) : undefined,
          notes:        form.notes || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'فشل إرسال العرض');
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="offer-form">
      <div className="offer-form-title">&#128228; تقديم عرض السعر</div>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">السعر (ريال) *</label>
          <input className="form-input" type="number" min="0" placeholder="850" value={form.price} onChange={e => set('price', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">الضمان</label>
          <input className="form-input" placeholder="مثال: سنة واحدة" value={form.warranty} onChange={e => set('warranty', e.target.value)} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">بلد المنشأ</label>
          <select className="form-select" value={form.origin} onChange={e => set('origin', e.target.value)}>
            {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">التوصيل؟</label>
          <select className="form-select" value={form.delivery} onChange={e => set('delivery', e.target.value)}>
            <option value="yes">نعم، يوجد توصيل</option>
            <option value="no">لا، بدون توصيل</option>
          </select>
        </div>
      </div>
      {form.delivery === 'yes' && (
        <div className="form-group">
          <label className="form-label">مدة التوصيل (أيام)</label>
          <input className="form-input" type="number" min="1" placeholder="3" value={form.delivery_days} onChange={e => set('delivery_days', e.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">ملاحظات</label>
        <textarea className="form-textarea" placeholder="أي تفاصيل إضافية..." value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      {error && <div className="error-box">{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
          {loading ? 'جارٍ الإرسال...' : 'إرسال العرض'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={onDone}>إلغاء</button>
      </div>
    </div>
  );
}

// ── Supplier dashboard ────────────────────────────────────
function Dashboard({ supplierId }: { supplierId: string }) {
  const [tab,       setTab]       = useState<'requests' | 'submitted'>('requests');
  const [requests,  setRequests]  = useState<Request[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [formFor,   setFormFor]   = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [toast,     setToast]     = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/suppliers?supplier_id=${supplierId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Request[];
      setRequests(data.filter(Boolean));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل الطلبات');
    } finally { setLoading(false); }
  }, [supplierId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleDone = (reqId: string) => {
    setSubmitted(prev => new Set([...prev, reqId]));
    setFormFor(null);
    setToast('تم إرسال عرضك بنجاح! ✓');
    setTimeout(() => setToast(''), 3000);
  };

  const pending   = requests.filter(r => !submitted.has(r.id) && r.status === 'active');
  const sent      = requests.filter(r => submitted.has(r.id));

  return (
    <div className="supplier-page">
      {toast && <div className="toast">{toast}</div>}
      <div className="panel-container">
        <Link href="/" className="back-link">&#8594; رجوع للرئيسية</Link>
        <div className="panel-title">&#9889; لوحة المورد</div>

        <div className="tabs-bar">
          <button className={`tab-btn${tab === 'requests' ? ' active' : ''}`} onClick={() => setTab('requests')}>
            الطلبات الجديدة {pending.length > 0 && `(${pending.length})`}
          </button>
          <button className={`tab-btn${tab === 'submitted' ? ' active' : ''}`} onClick={() => setTab('submitted')}>
            عروضي المرسلة {sent.length > 0 && `(${sent.length})`}
          </button>
        </div>

        {/* New requests */}
        {tab === 'requests' && (
          <>
            {loading && <div className="loading-wrap"><div className="spinner" />تحميل الطلبات...</div>}
            {error   && <div className="error-box">{error}</div>}
            {!loading && !error && pending.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">&#128228;</div>
                <div className="empty-state-text">لا توجد طلبات جديدة بعد</div>
              </div>
            )}
            {pending.map(req => (
              <div key={req.id} className="request-card">
                <div className="request-card-header">
                  <div>
                    <span className="new-tag">جديد</span>
                    <span className="request-card-title">{req.title}</span>
                  </div>
                  <span className="request-card-cat">{CAT_LABELS[req.category_id] ?? req.category_id}</span>
                </div>
                <div className="request-card-meta">
                  <span className="meta-item">&#128205; {req.city}</span>
                  {req.quantity        && <span className="meta-item">&#128230; {req.quantity}</span>}
                  {req.delivery_needed && <span className="meta-item">&#128666; توصيل مطلوب</span>}
                  {req.car_brand       && <span className="meta-item">&#128663; {req.car_brand} {req.car_model} {req.car_year}</span>}
                  <span className="meta-item" style={{ direction: 'ltr' }}>
                    {new Date(req.created_at).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                {formFor === req.id ? (
                  <OfferForm requestId={req.id} supplierId={supplierId} onDone={() => handleDone(req.id)} />
                ) : (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setFormFor(req.id)}>
                    إرسال عرض السعر
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* Submitted */}
        {tab === 'submitted' && (
          sent.length === 0
            ? <div className="empty-state"><div className="empty-state-icon">&#128228;</div><div className="empty-state-text">لم ترسل أي عروض بعد</div></div>
            : sent.map(req => (
              <div key={req.id} className="request-card">
                <div className="request-card-title">{req.title}</div>
                <div style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13, marginTop: 6 }}>
                  &#10003; تم إرسال العرض
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────
export default function SupplierPage() {
  const [supplierId, setSupplierId] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('taseer_supplier_id') : null;
    if (stored) setSupplierId(stored);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      {supplierId ? (
        <>
          <div style={{ background: 'var(--teal3)', padding: '6px 20px' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => { localStorage.removeItem('taseer_supplier_id'); setSupplierId(null); }}
            >
              &#128682; تسجيل الخروج
            </button>
          </div>
          <Dashboard supplierId={supplierId} />
        </>
      ) : (
        <RegisterForm onRegistered={setSupplierId} />
      )}
      <Footer />
    </div>
  );
}
