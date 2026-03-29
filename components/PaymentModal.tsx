'use client';
// components/PaymentModal.tsx
import { useState } from 'react';
import { PAYMENT_PACKAGES } from '@/types';
import type { PackageType } from '@/types';
import { getSessionId } from '@/lib/session';

interface Props {
  offers:    { id: string; is_unlocked: boolean }[];
  requestId: string;
  sessionId: string;
  onClose:   () => void;
  onSuccess: (unlockedIds: string[]) => void;
}

const IS_SANDBOX = process.env.NODE_ENV !== 'production';

export default function PaymentModal({ offers, requestId, sessionId, onClose, onSuccess }: Props) {
  const [selected, setSelected] = useState<PackageType>('triple');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const lockedOfferIds = offers.filter(o => !o.is_unlocked).map(o => o.id);
  const pkg = PAYMENT_PACKAGES[selected];
  const idsToUnlock = lockedOfferIds.slice(0, pkg.count);

  const handlePay = async () => {
    if (idsToUnlock.length === 0) { onClose(); return; }
    setLoading(true);
    setError('');

    try {
      if (IS_SANDBOX) {
        // Sandbox: confirm without real payment
        const res = await fetch('/api/payment/sandbox-confirm', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id:   requestId,
            offer_ids:    idsToUnlock,
            package_type: selected,
            session_id:   sessionId || getSessionId(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'فشل الدفع');
        onSuccess(idsToUnlock);
        return;
      }

      // Production: create Moyasar session and redirect
      const res = await fetch('/api/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id:   requestId,
          offer_ids:    idsToUnlock,
          package_type: selected,
          session_id:   sessionId || getSessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'فشل إنشاء جلسة الدفع');
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error('لم يُرجع البوابة رابط الدفع');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal-title">&#128275; اكشف بيانات المورد</div>
        <div className="modal-subtitle">
          اختر الباقة للحصول على بيانات التواصل مع الموردين
        </div>

        {IS_SANDBOX && (
          <div className="sandbox-banner">
            &#9888;&#65039; وضع الاختبار &mdash; لن يُحسم أي مبلغ حقيقي
          </div>
        )}

        {/* Package selector */}
        <div className="packages-grid" style={{ marginBottom: 22 }}>
          {(Object.keys(PAYMENT_PACKAGES) as PackageType[]).map((key) => {
            const p = PAYMENT_PACKAGES[key];
            return (
              <div
                key={key}
                className={`package-card${selected === key ? ' selected' : ''}`}
                onClick={() => setSelected(key)}
              >
                {key === 'triple' && <span className="package-popular">الأشهر</span>}
                <div className="package-count">{p.count}</div>
                <div className="package-label">{p.label_ar}</div>
                <div className="package-price">{p.amount_sar.toFixed(2)}</div>
                <div className="package-currency">ريال</div>
              </div>
            );
          })}
        </div>

        {idsToUnlock.length === 0 && (
          <div className="error-box">جميع العروض مكشوفة بالفعل</div>
        )}

        {error && <div className="error-box">{error}</div>}

        <button
          className="btn btn-gold btn-full btn-lg"
          onClick={handlePay}
          disabled={loading || idsToUnlock.length === 0}
        >
          {loading
            ? 'جارٍ المعالجة...'
            : `الدفع الآن — ${pkg.amount_sar.toFixed(2)} ريال`}
        </button>

        <div className="pay-security">
          &#128274; دفع آمن &middot; مدى &middot; فيزا &middot; ماستركارد &middot; Apple Pay
        </div>
      </div>
    </div>
  );
}
