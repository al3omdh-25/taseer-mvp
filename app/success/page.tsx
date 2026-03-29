'use client';
// app/success/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessInner() {
  const params = useSearchParams();
  const code   = params.get('code') ?? '';
  const id     = params.get('id')   ?? '';

  return (
    <div className="success-page">
      <div className="success-icon">&#127881;</div>
      <div className="success-title">تم إرسال طلبك!</div>
      <div className="success-subtitle">
        وصل طلبك إلى موردين متخصصين في فئتك.<br />
        ستصلك العروض خلال ساعات قليلة.
      </div>

      <div className="request-code-box">
        <div className="request-code">{code}</div>
        <div className="request-code-label">رقم طلبك — احتفظ به لمتابعة العروض</div>
      </div>

      <div className="success-actions">
        {id && (
          <Link
            href={`/offers?request_id=${id}&code=${code}`}
            className="btn btn-primary btn-full btn-lg"
          >
            عرض العروض الواردة
          </Link>
        )}
        <Link href="/" className="btn btn-outline btn-full">
          العودة للرئيسية
        </Link>
      </div>

      <p style={{ marginTop: 28, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        لمتابعة طلبك لاحقاً ادخل رقم الطلب:&nbsp;
        <strong style={{ color: 'var(--teal)', fontFamily: 'monospace', direction: 'ltr', display: 'inline-block' }}>
          {code}
        </strong>
        &nbsp;في صفحة العروض
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="loading-wrap"><div className="spinner" /></div>}>
      <SuccessInner />
    </Suspense>
  );
}
