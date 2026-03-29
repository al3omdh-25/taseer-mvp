'use client';
// components/OfferCard.tsx
import type { OfferPublic } from '@/types';

interface Props {
  offer: OfferPublic;
  onUnlock: (offer: OfferPublic) => void;
}

const STYPE_LABELS: Record<string, string> = {
  company: 'شركة',
  store:   'متجر',
  trader:  'تاجر',
  agent:   'وكيل',
};

export default function OfferCard({ offer, onUnlock }: Props) {
  const waNumber = (offer.supplier_whatsapp ?? '').replace(/^0/, '966');

  return (
    <div className="offer-card">

      {/* Trust badges */}
      <div className="offer-badges">
        {offer.is_fast    && <span className="badge badge-fast">&#9889; سريع الرد</span>}
        {offer.is_trusted && <span className="badge badge-trusted">&#11088; مورد موثوق</span>}
      </div>

      {/* Price */}
      <div className="offer-price">
        {Number(offer.price).toLocaleString('ar-SA')}
        <span>ريال</span>
      </div>

      {/* Public info — always visible */}
      <div className="offer-meta">
        <div className="offer-meta-row">&#128205; {offer.city}</div>
        <div className="offer-meta-row">&#127758; المنشأ: {offer.origin}</div>
        {offer.warranty && (
          <div className="offer-meta-row">&#128737; ضمان: {offer.warranty}</div>
        )}
        <div className="offer-meta-row">
          {offer.delivery
            ? <>&#128666; توصيل {offer.delivery_days ? `– ${offer.delivery_days} أيام` : ''}</>
            : <>&#10060; بدون توصيل</>}
        </div>
      </div>

      <span className="offer-stype">
        {STYPE_LABELS[offer.supplier_type] ?? offer.supplier_type}
      </span>

      {/* Contact section */}
      {offer.is_unlocked ? (
        <div className="offer-contact">
          <div className="contact-name">{offer.supplier_name}</div>
          <div className="contact-row">&#128222; {offer.supplier_phone}</div>
          <div className="contact-row">&#128205; {offer.supplier_city}</div>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-btn"
          >
            &#128241; تواصل عبر واتساب
          </a>
        </div>
      ) : (
        <div className="offer-lock">
          <div className="offer-lock-icon">&#128274;</div>
          <div className="offer-lock-text">بيانات المورد مخفية</div>
          <button
            className="btn btn-gold btn-full btn-sm"
            onClick={() => onUnlock(offer)}
          >
            اكشف بيانات المورد
          </button>
        </div>
      )}
    </div>
  );
}
