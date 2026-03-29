'use client';
// app/offers/page.tsx
// Fetches real offers from the DB, handles payment unlock.
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import OfferCard from '@/components/OfferCard';
import PaymentModal from '@/components/PaymentModal';
import { getSessionId } from '@/lib/session';
import type { OfferPublic } from '@/types';

function OffersContent() {
  const params    = useSearchParams();
  const requestId = params.get('request_id') ?? '';
  const code      = params.get('code')       ?? '';
  const payStatus = params.get('payment')    ?? '';

  const [offers,    setOffers]    = useState<OfferPublic[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [sessionId, setSessionId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast,     setToast]     = useState('');
  const [toastErr,  setToastErr]  = useState(false);

  // Track by code form
  const [trackCode, setTrackCode] = useState('');
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackErr,  setTrackErr]  = useState('');

  // Initialise session ID client-side only
  useEffect(() => { setSessionId(getSessionId()); }, []);

  // Toast on payment redirect
  useEffect(() => {
    if (payStatus === 'success') showToast('تم الدفع بنجاح! تم كشف بيانات المورد ✓', false);
    else if (payStatus === 'failed') showToast('فشل الدفع. حاول مجدداً.', true);
    else if (payStatus === 'error')  showToast('حدث خطأ في عملية الدفع.', true);
  }, [payStatus]);

  const showToast = (msg: string, isErr: boolean) => {
    setToast(msg); setToastErr(isErr);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchOffers = useCallback(async () => {
    if (!requestId) return;
    const sid = getSessionId();
    setLoading(true); setError('');
    try {
      const res = await fetch(
        `/api/offers?request_id=${requestId}&session=${encodeURIComponent(sid)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOffers(await res.json() as OfferPublic[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل تحميل العروض');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchOffers(); }, [fetchOffers, sessionId]);

  // Re-fetch after successful payment redirect
  useEffect(() => {
    if (payStatus === 'success') setTimeout(fetchOffers, 800);
  }, [payStatus, fetchOffers]);

  const handleUnlockSuccess = (unlockedIds: string[]) => {
    setShowModal(false);
    setOffers(prev => prev.map(o =>
      unlockedIds.includes(o.id) ? { ...o, is_unlocked: true } : o
    ));
    showToast('تم الكشف! جارٍ تحميل بيانات الموردين...', false);
    setTimeout(fetchOffers, 700);
  };

  // Track by code
  const handleTrack = async () => {
    const c = trackCode.trim().toUpperCase();
    if (!c) return;
    setTrackBusy(true); setTrackErr('');
    try {
      const res = await fetch(`/api/requests?code=${c}`);
      if (!res.ok) { setTrackErr('رقم الطلب غير موجود'); return; }
      const req = await res.json() as { id: string; request_code: string };
      window.location.href = `/offers?request_id=${req.id}&code=${req.request_code}`;
    } catch {
      setTrackErr('فشل البحث. حاول مجدداً.');
    } finally {
      setTrackBusy(false);
    }
  };

  const unlockedCount = offers.filter(o => o.is_unlocked).length;
  const lockedCount   = offers.filter(o => !o.is_unlocked).length;

  // ── No request_id: show lookup form ───────────────────────
  if (!requestId) {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
        <div className="auth-card">
          <div className="auth-title">&#128202; تتبع طلبك</div>
          <div className="auth-subtitle">أدخل رقم الطلب لعرض العروض الواردة</div>
          <div className="form-group">
            <label className="form-label">رقم الطلب</label>
            <input
              className="form-input"
              placeholder="TAS-XXXXXX"
              value={trackCode}
              onChange={e => setTrackCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              style={{ fontFamily: 'monospace', letterSpacing: 2 }}
            />
          </div>
          {trackErr && <div className="error-box">{trackErr}</div>}
          <button
            className="btn btn-primary btn-full"
            onClick={handleTrack}
            disabled={trackBusy || !trackCode.trim()}
          >
            {trackBusy ? 'جارٍ البحث...' : 'عرض العروض ←'}
          </button>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/request" className="btn btn-outline btn-sm">
              إنشاء طلب جديد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Offers view ────────────────────────────────────────────
  return (
    <div className="offers-container">
      {toast && (
        <div className={`toast${toastErr ? ' toast-error' : ''}`}>{toast}</div>
      )}

      <Link href="/" className="back-link" style={{ marginBottom: 20, display: 'inline-flex' }}>
        &#8594; رجوع للرئيسية
      </Link>

      <div style={{ marginBottom: 20 }}>
        <div className="offers-title">العروض الواردة</div>
        {code && (
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)', direction: 'ltr', display: 'inline-block' }}>
            {code}
          </div>
        )}
      </div>

      {/* Count bar */}
      {!loading && offers.length > 0 && (
        <div className="offers-count-bar">
          <span>&#128229; {offers.length} عروض واردة من الموردين</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
            {unlockedCount > 0 ? `${unlockedCount} مكشوف · ` : ''}{lockedCount} مقفل
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-wrap">
          <div className="spinner" />
          جارٍ تحميل العروض...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="error-box">
          {error}
          <button onClick={fetchOffers} className="btn btn-sm btn-outline" style={{ marginTop: 10 }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && offers.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128228;</div>
          <div className="empty-state-text">لم تصل عروض بعد — سيتواصل معك الموردون قريباً</div>
          <button onClick={fetchOffers} className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>
            تحديث
          </button>
        </div>
      )}

      {/* Offers list */}
      {!loading && offers.length > 0 && (
        <>
          {/* Unlock all CTA */}
          {lockedCount > 0 && (
            <div style={{
              background: 'var(--white)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>اكشف بيانات الموردين</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>من 1.99 ريال للعرض الواحد</div>
              </div>
              <button className="btn btn-gold" onClick={() => setShowModal(true)}>
                &#128275; اكشف الآن
              </button>
            </div>
          )}

          <div className="offers-list">
            {offers.map(offer => (
              <OfferCard key={offer.id} offer={offer} onUnlock={() => setShowModal(true)} />
            ))}
          </div>

          {/* Package box at bottom */}
          {lockedCount > 0 && (
            <div className="packages-box">
              <div className="packages-title">باقات الكشف</div>
              <div className="packages-sub">احصل على بيانات أكثر من مورد وقارن بينهم</div>
              <div className="packages-grid">
                {[
                  { c: 1,  p: '1.99',  l: 'عرض واحد',  pop: false },
                  { c: 3,  p: '5.99',  l: '3 عروض',    pop: true  },
                  { c: 10, p: '14.99', l: '10 عروض',   pop: false },
                ].map(pkg => (
                  <div key={pkg.c} className={`package-card${pkg.pop ? '' : ''}`} onClick={() => setShowModal(true)}>
                    {pkg.pop && <span className="package-popular">الأفضل</span>}
                    <div className="package-count">{pkg.c}</div>
                    <div className="package-label">{pkg.l}</div>
                    <div className="package-price">{pkg.p}</div>
                    <div className="package-currency">ريال</div>
                  </div>
                ))}
              </div>
              <div className="pay-security">&#128274; دفع آمن · مدى · فيزا · ماستركارد</div>
            </div>
          )}
        </>
      )}

      {/* Payment modal */}
      {showModal && sessionId && (
        <PaymentModal
          offers={offers}
          requestId={requestId}
          sessionId={sessionId}
          onClose={() => setShowModal(false)}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  );
}

export default function OffersPage() {
  return (
    <div className="offers-page">
      <Nav />
      <Suspense fallback={<div className="loading-wrap"><div className="spinner" />تحميل...</div>}>
        <OffersContent />
      </Suspense>
      <Footer />
    </div>
  );
}
