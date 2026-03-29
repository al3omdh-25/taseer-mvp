'use client';
// app/request/page.tsx — Step-by-step request wizard
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSessionId } from '@/lib/session';
import type { PartCondition } from '@/types';

const CATS = [
  { id: 'home',     label: 'الأجهزة المنزلية والتكييف', icon: '❄️' },
  { id: 'building', label: 'مواد البناء',               icon: '🏗️' },
  { id: 'elec',     label: 'الإلكترونيات',              icon: '📱' },
  { id: 'services', label: 'خدمات المنازل',             icon: '🔧' },
  { id: 'furn',     label: 'الأثاث والمفروشات',         icon: '🛋️' },
  { id: 'cars',     label: 'قطع غيار السيارات',         icon: '🚗' },
  { id: 'other',    label: 'طلبات أخرى',                icon: '📦' },
];

const CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'الخبر', 'أبها', 'تبوك', 'بريدة', 'حائل', 'جيزان', 'نجران', 'الطائف',
];

const ORIGINS = [
  'لا يهم', 'المملكة العربية السعودية', 'الصين', 'ألمانيا',
  'اليابان', 'الولايات المتحدة', 'كوريا', 'الإمارات', 'تركيا',
];

const CAR_BRANDS = [
  'تويوتا', 'هيونداي', 'كيا', 'نيسان', 'فورد', 'شيفروليه',
  'هوندا', 'مرسيدس', 'بي إم دبليو', 'لكزس', 'ميتسوبيشي', 'سوبارو',
  'مازدا', 'فولكس فاجن', 'جيب', 'رنج روفر',
];

interface FD {
  category_id: string; title: string; specs: string; quantity: string;
  city: string; delivery_needed: string; origin_pref: string;
  warranty_pref: string; notes: string;
  car_brand: string; car_model: string; car_year: string; part_condition: string;
  requester_phone: string;
}

type SType = 'cat' | 'input' | 'textarea' | 'select' | 'options';

interface Step {
  key: keyof FD; q: string; hint?: string;
  type: SType; ph?: string; opts?: string[];
}

const STD: Step[] = [
  { key: 'category_id',     type: 'cat',      q: 'اختر فئة المنتج' },
  { key: 'title',           type: 'input',    q: 'ما المنتج أو الخدمة المطلوبة؟',  hint: 'اكتب الاسم بوضوح', ph: 'مثال: مكيف سبليت 18000 وحدة' },
  { key: 'specs',           type: 'textarea', q: 'ما المواصفات المطلوبة؟',          hint: 'الحجم، النوع، الخصائص (اختياري)', ph: 'أدخل المواصفات التفصيلية' },
  { key: 'quantity',        type: 'input',    q: 'الكمية المطلوبة؟',               hint: 'أدخل العدد أو الوزن', ph: 'مثال: 5 قطع، طن واحد' },
  { key: 'city',            type: 'select',   q: 'في أي مدينة أنت؟',              opts: CITIES },
  { key: 'delivery_needed', type: 'options',  q: 'هل تحتاج توصيل؟',              opts: ['نعم، أحتاج توصيل', 'لا، سأستلم بنفسي'] },
  { key: 'origin_pref',     type: 'options',  q: 'هل تفضل بلد منشأ معين؟',       opts: ORIGINS },
  { key: 'warranty_pref',   type: 'options',  q: 'هل الضمان مهم لك؟',            opts: ['نعم، الضمان مهم', 'لا يهم', 'حسب السعر'] },
  { key: 'requester_phone', type: 'input',    q: 'رقم جوالك للإشعارات؟',          hint: 'اختياري', ph: '05xxxxxxxx' },
];

const CAR: Step[] = [
  { key: 'category_id',    type: 'cat',      q: 'اختر الفئة' },
  { key: 'car_brand',      type: 'select',   q: 'ما ماركة السيارة؟',             opts: CAR_BRANDS },
  { key: 'car_model',      type: 'input',    q: 'ما موديل السيارة؟',             hint: 'مثال: كامري، كورولا، باترول، F150', ph: 'اكتب الموديل' },
  { key: 'car_year',       type: 'input',    q: 'سنة الصنع؟',                   hint: 'مثال: 2018، 2021', ph: 'السنة' },
  { key: 'title',          type: 'input',    q: 'ما اسم القطعة المطلوبة؟',       hint: 'مثال: فحمات، رديتر، مساعدات، تيل', ph: 'اكتب اسم القطعة' },
  { key: 'part_condition', type: 'options',  q: 'ما نوع القطعة المطلوبة؟',       opts: ['جديد', 'مستعمل', 'أصلي', 'صيني (aftermarket)'] },
  { key: 'quantity',       type: 'input',    q: 'الكمية المطلوبة؟',              ph: 'مثال: قطعة واحدة، 4 قطع' },
  { key: 'city',           type: 'select',   q: 'في أي مدينة أنت؟',             opts: CITIES },
  { key: 'delivery_needed',type: 'options',  q: 'هل تحتاج توصيل؟',              opts: ['نعم، أحتاج توصيل', 'لا، سأستلم بنفسي'] },
  { key: 'requester_phone',type: 'input',    q: 'رقم جوالك للإشعارات؟',          hint: 'اختياري', ph: '05xxxxxxxx' },
];

const PART_COND: Record<string, PartCondition> = {
  'جديد':                 'new',
  'مستعمل':               'used',
  'أصلي':                 'original',
  'صيني (aftermarket)':   'aftermarket',
};

// ── optional fields that are always valid ──────────────────
const OPTIONAL: (keyof FD)[] = ['specs', 'notes', 'requester_phone'];

function WizardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initCat = params.get('cat') ?? '';
  const initQ   = params.get('q')   ?? '';

  const [cat,  setCat]  = useState(initCat);
  const [step, setStep] = useState(initCat ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const [d, setD] = useState<FD>({
    category_id: initCat, title: initQ, specs: '', quantity: '',
    city: '', delivery_needed: '', origin_pref: '', warranty_pref: '', notes: '',
    car_brand: '', car_model: '', car_year: '', part_condition: '', requester_phone: '',
  });

  const steps = cat === 'cars' ? CAR : STD;
  const cur   = steps[step];
  const total = steps.length;
  const pct   = total > 1 ? Math.round((step / (total - 1)) * 100) : 0;

  const set = (key: keyof FD, val: string) => {
    setD(p => ({ ...p, [key]: val }));
    if (key === 'category_id') setCat(val);
  };

  const valid = (): boolean => {
    if (!cur) return false;
    if (cur.type === 'cat') return !!cat;
    if (OPTIONAL.includes(cur.key)) return true;
    return (d[cur.key] ?? '').trim().length > 0;
  };

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const title = cat === 'cars'
        ? [d.car_brand, d.car_model, d.car_year, d.title].filter(Boolean).join(' ').replace(/^[\s-]+/, '')
        : d.title;

      const payload = {
        category_id:     d.category_id || cat,
        title,
        specs:           d.specs           || undefined,
        quantity:        d.quantity        || undefined,
        city:            d.city,
        delivery_needed: d.delivery_needed === 'نعم، أحتاج توصيل',
        origin_pref:     d.origin_pref === 'لا يهم' ? undefined : d.origin_pref || undefined,
        warranty_pref:   d.warranty_pref   || undefined,
        notes:           d.notes           || undefined,
        car_brand:       d.car_brand       || undefined,
        car_model:       d.car_model       || undefined,
        car_year:        d.car_year        || undefined,
        part_condition:  PART_COND[d.part_condition] ?? undefined,
        requester_phone: d.requester_phone || undefined,
        session_id:      getSessionId(),
      };

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const { request_code, request_id } = await res.json() as { request_code: string; request_id: string };
      router.push(`/success?code=${request_code}&id=${request_id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'حدث خطأ. حاول مجدداً.');
      setBusy(false);
    }
  };

  const next = () => { if (step < total - 1) setStep(s => s + 1); else submit(); };
  const back = () => { if (step === 0) router.push('/'); else setStep(s => s - 1); };

  return (
    <div className="wizard-page">
      <div className="wizard-header">
        <span className="back-link" onClick={back}>&#8594; رجوع</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label">الخطوة {step + 1} من {total}</div>
      </div>

      <div className="wizard-card">
        <div className="wizard-question">{cur?.q}</div>
        {cur?.hint && <div className="wizard-hint">{cur.hint}</div>}

        {cur?.type === 'cat' && (
          <div className="wizard-options">
            {CATS.map(c => (
              <div
                key={c.id}
                className={`wizard-option${cat === c.id ? ' selected' : ''}`}
                onClick={() => set('category_id', c.id)}
              >
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                {c.label}
              </div>
            ))}
          </div>
        )}

        {cur?.type === 'input' && (
          <input
            className="wizard-input"
            placeholder={cur.ph ?? ''}
            value={d[cur.key] ?? ''}
            onChange={e => set(cur.key, e.target.value)}
            onKeyDown={e => e.key === 'Enter' && valid() && next()}
          />
        )}

        {cur?.type === 'textarea' && (
          <textarea
            className="wizard-input"
            style={{ minHeight: 96 }}
            placeholder={cur.ph ?? ''}
            value={d[cur.key] ?? ''}
            onChange={e => set(cur.key, e.target.value)}
          />
        )}

        {cur?.type === 'select' && (
          <select
            className="wizard-select"
            value={d[cur.key] ?? ''}
            onChange={e => set(cur.key, e.target.value)}
          >
            <option value="">-- اختر --</option>
            {cur.opts?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {cur?.type === 'options' && (
          <div className="wizard-options">
            {cur.opts?.map(o => (
              <div
                key={o}
                className={`wizard-option${d[cur.key] === o ? ' selected' : ''}`}
                onClick={() => set(cur.key, o)}
              >
                {o}
              </div>
            ))}
          </div>
        )}

        {err && <div className="error-box">{err}</div>}

        <div className="wizard-nav">
          <button className="wizard-back-btn" onClick={back}>رجوع</button>
          <button
            className="wizard-next-btn"
            onClick={next}
            disabled={!valid() || busy}
          >
            {busy ? 'جارٍ الإرسال...' : step === total - 1 ? 'إرسال الطلب ✓' : 'التالي ←'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="loading-wrap"><div className="spinner" />تحميل...</div>}>
      <WizardInner />
    </Suspense>
  );
}
