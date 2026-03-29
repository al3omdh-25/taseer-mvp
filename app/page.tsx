'use client';
// app/page.tsx — Homepage
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const CATS = [
  { id: 'home',     label: 'الأجهزة المنزلية والتكييف', icon: '❄️' },
  { id: 'building', label: 'مواد البناء',               icon: '🏗️' },
  { id: 'elec',     label: 'الإلكترونيات',              icon: '📱' },
  { id: 'services', label: 'خدمات المنازل',             icon: '🔧' },
  { id: 'furn',     label: 'الأثاث والمفروشات',         icon: '🛋️' },
  { id: 'cars',     label: 'قطع غيار السيارات',         icon: '🚗' },
  { id: 'other',    label: 'طلبات أخرى',                icon: '📦' },
];

const EXAMPLES = [
  'مكيف سبليت 18 وحدة',
  'حديد 16 ملم',
  'شاشة سامسونج 65 بوصة',
  'قطع غيار تويوتا كامري',
  'كنب مودرن',
];

// Static sample cards — just for social proof display on homepage
const DEMO_OFFERS = [
  { id: 1, price: 850,  city: 'الرياض', origin: 'الصين',   warranty: '12 شهر', delivery: true,  days: 3, stype: 'شركة',  trusted: true,  fast: false },
  { id: 2, price: 920,  city: 'جدة',    origin: 'ألمانيا', warranty: '24 شهر', delivery: true,  days: 2, stype: 'وكيل',  trusted: false, fast: true  },
  { id: 3, price: 780,  city: 'الدمام', origin: 'الصين',   warranty: '6 أشهر', delivery: false, days: 0, stype: 'متجر',  trusted: false, fast: false },
  { id: 4, price: 1050, city: 'الرياض', origin: 'اليابان', warranty: '24 شهر', delivery: true,  days: 4, stype: 'وكيل',  trusted: true,  fast: false },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, []);

  const go = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/request?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-badge">&#128640; منصة تسعير الذكية</div>
        <h1>اطلب <span>عروض أسعار</span><br />من الموردين بسهولة</h1>
        <p className="hero-sub">
          أكثر من 150 مورد معتمد في جميع أنحاء المملكة العربية السعودية
        </p>
        <div className="hero-search-wrap">
          <input
            className="hero-input"
            type="text"
            placeholder={EXAMPLES[phIdx]}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()}
          />
          <button className="hero-search-btn" onClick={go}>
            اطلب تسعيرة &#8592;
          </button>
        </div>
        <div className="hero-chips">
          {EXAMPLES.map(ex => (
            <span key={ex} className="hero-chip" onClick={() => setQuery(ex)}>{ex}</span>
          ))}
        </div>
        <div className="hero-stats">
          <div>
            <div className="stat-num">+240</div>
            <div className="stat-lbl">طلب مكتمل</div>
          </div>
          <div>
            <div className="stat-num">+150</div>
            <div className="stat-lbl">مورد معتمد</div>
          </div>
          <div>
            <div className="stat-num">7</div>
            <div className="stat-lbl">تصنيفات</div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────── */}
      <div className="trust-bar">
        {[
          ['&#128274;', 'بيانات المورد محمية'],
          ['&#9889;',   'عروض خلال ساعات'],
          ['&#9989;',   'موردون موثوقون'],
          ['&#128179;', 'دفع آمن بمدى'],
        ].map(([icon, label]) => (
          <div key={label} className="trust-item">
            <span dangerouslySetInnerHTML={{ __html: icon }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── CATEGORIES ────────────────────────────────────── */}
      <div className="section">
        <div className="section-title">تصفح حسب الفئة</div>
        <div className="cats-grid">
          {CATS.map(c => (
            <Link key={c.id} href={`/request?cat=${c.id}`} className="cat-card">
              <div className="cat-icon">{c.icon}</div>
              <div className="cat-name">{c.label}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── SAMPLE OFFERS (social proof) ──────────────────── */}
      <div style={{ background: 'var(--bg2)' }}>
        <div className="section">
          <div className="section-title">أفضل العروض اليوم</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {DEMO_OFFERS.map(o => (
              <div key={o.id} className="offer-card">
                <div className="offer-badges">
                  {o.fast    && <span className="badge badge-fast">&#9889; سريع الرد</span>}
                  {o.trusted && <span className="badge badge-trusted">&#11088; مورد موثوق</span>}
                </div>
                <div className="offer-price">
                  {o.price.toLocaleString('ar-SA')} <span>ريال</span>
                </div>
                <div className="offer-meta">
                  <div className="offer-meta-row">&#128205; {o.city}</div>
                  <div className="offer-meta-row">&#127758; {o.origin}</div>
                  <div className="offer-meta-row">&#128737; ضمان: {o.warranty}</div>
                  <div className="offer-meta-row">
                    {o.delivery
                      ? `&#128666; توصيل – ${o.days} أيام`
                      : '&#10060; بدون توصيل'}
                  </div>
                </div>
                <span className="offer-stype">{o.stype}</span>
                <div className="offer-lock">
                  <div className="offer-lock-icon">&#128274;</div>
                  <div className="offer-lock-text">بيانات المورد مخفية</div>
                  <Link
                    href="/request"
                    className="btn btn-gold btn-full btn-sm"
                    style={{ display: 'block', textAlign: 'center', marginTop: 8 }}
                  >
                    اطلب تسعيرتك الآن
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <div className="section">
        <div className="section-title">كيف يعمل تسعير؟</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          {[
            ['&#128221;', '1', 'أرسل طلبك',    'اكتب ما تريد تسعيره واملأ التفاصيل خطوة بخطوة'],
            ['&#128232;', '2', 'يصل للموردين',  'يتلقى 5-7 موردين مناسبين طلبك مباشرة'],
            ['&#128176;', '3', 'استلم العروض',  'يقدم الموردون عروضهم الحقيقية بالأسعار'],
            ['&#128275;', '4', 'تواصل معهم',    'ادفع رسوماً رمزية لكشف بيانات أفضل مورد'],
          ].map(([icon, num, title, desc]) => (
            <div
              key={num}
              style={{
                background: 'var(--white)', borderRadius: 'var(--r)', padding: 20,
                textAlign: 'center', border: '1.5px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: icon }} />
              <div style={{
                background: 'var(--teal)', color: '#fff', borderRadius: '50%',
                width: 28, height: 28, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                margin: '0 auto 10px', fontFamily: 'Tajawal, sans-serif',
              }}>
                {num}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
