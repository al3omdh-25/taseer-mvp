# تسعير – Taseer MVP

نسخة تشغيلية مبسطة قابلة للاختبار المغلق.

---

## Core Loop

```
مشتري → ويزارد + OTP إلزامي → طلب محفوظ (phone_verified=true)
      → إشعار واتساب فوري للموردين (approved+active فقط)
      → مورد يرسل عرض
      → إشعار واتساب للمشتري عند 1/3/5 عروض
      → مشتري يطلب كشف بيانات مورد
      → admin يوافق → واتساب للمشتري بالبيانات
      → [لو لم يتصرف admin خلال 24h → كشف تلقائي]
```

---

## Supplier Verification Flow

```
مورد يسجل → verification_status='pending', is_active=false
          → admin يفتح /admin → تبويب "موردون معلقون"
          → موافقة → POST /api/admin/suppliers/verify {action:'approved'}
                   → verification_status='approved', is_active=true
                   → verified_at=NOW(), verified_by='admin'
                   → واتساب للمورد: "تم قبول طلبك ✅"
          → رفض  → POST /api/admin/suppliers/verify {action:'rejected', reason:'...'}
                   → verification_status='rejected', is_active=false
                   → rejection_reason محفوظ
                   → واتساب للمورد: "لم يتم قبول طلبك"
```

### حالات verification_status

| الحالة | المعنى | يستقبل طلبات؟ |
|---|---|---|
| `pending` | سجّل ولم يُراجَع | ❌ |
| `approved` | admin وافق | ✅ (مع is_active=true) |
| `rejected` | رُفض عند التسجيل | ❌ |
| `suspended` | كان نشطاً وأُوقف | ❌ |

**approved ≠ trusted** — `is_trusted` يُمنح يدوياً فقط بعد أداء حقيقي.

---

## هيكل الملفات

```
app/
  api/
    otp/route.ts                    إرسال + تحقق OTP
    suppliers/route.ts              تسجيل المورد (دائماً pending)
    requests/route.ts               إنشاء طلب + إشعار الموردين
    offers/route.ts                 عروض + طلب الكشف
    admin/
      route.ts                      لوحة الإدارة (GET + POST)
      suppliers/verify/route.ts     ← endpoint مستقل للموافقة/الرفض
    startup/route.ts                فحص إعدادات الإشعارات
  admin/page.tsx                    لوحة الإدارة (7 تبويبات)
  request/page.tsx                  ويزارد الطلب مع OTP
  offers/page.tsx                   عرض العروض
  supplier/page.tsx                 تسجيل + لوحة المورد
  success/page.tsx                  بعد إرسال الطلب
  track/page.tsx                    تتبع طلب برقمه
lib/
  notify.ts                         واتساب (Unifonic) + deduplication
  ratelimit.ts                      حماية من السبام
  session.ts                        جلسة مجهولة (localStorage)
  supabase.ts                       browser + service role
types/index.ts
schema.sql                          قاعدة بيانات جديدة (fresh)
migrate_rls.sql                     تحديث RLS على قاعدة موجودة
migrate_suppliers_verification.sql  إضافة حقول التحقق على قاعدة موجودة
```

---

## Matching Logic

لا يدخل المطابقة إلا:
```ts
// app/api/requests/route.ts
.eq('is_active', true)
.eq('verification_status', 'approved')
```

---

## Checklist قبل الإطلاق

```
[ ] شغّل schema.sql في Supabase SQL Editor
[ ] أنشئ .env.local من .env.example وأملأ الـ 4 قيم المطلوبة
[ ] ADMIN_SECRET_TOKEN: openssl rand -hex 24  (لا تستخدم الافتراضي)
[ ] للإشعارات الحقيقية: UNIFONIC_APP_SID + UNIFONIC_SENDER + NOTIFY_ENABLED=true
[ ] بعد النشر: افتح /api/startup → يجب أن يرجع mode:"live"
[ ] سجّل 5-10 موردين حقيقيين عبر /supplier
[ ] فعّلهم من /admin → تبويب "موردون معلقون"
[ ] اختبر الـ flow كاملاً بجوالين حقيقيين
```

---

## متى تستخدم أي ملف SQL؟

| الحالة | الملف |
|---|---|
| قاعدة بيانات جديدة تماماً | `schema.sql` |
| قاعدة موجودة، تحديث RLS فقط | `migrate_rls.sql` |
| قاعدة موجودة، إضافة نظام التحقق | `migrate_suppliers_verification.sql` |

---

## اختبار الـ flow بجوالين حقيقيين

```
الجوال الأول (admin):
1. افتح /supplier → سجّل كمورد
2. افتح /admin → وافق على نفسك

الجوال الثاني (مشتري):
3. افتح /request → أرسل طلب في نفس الفئة
4. تحقق بـ OTP
5. الجوال الأول يستقبل واتساب بالطلب
6. افتح /supplier بالجوال الأول → أرسل عرض
7. الجوال الثاني يستقبل واتساب: "وصل عرض"
8. افتح رابط العروض → اضغط "طلب كشف بيانات"
9. /admin → تبويب "طلبات الكشف" → وافق
10. الجوال الثاني يستقبل واتساب ببيانات المورد
```

---

## API Reference

### POST /api/admin/suppliers/verify
```
Headers: x-admin-token: YOUR_TOKEN
Body: { supplier_id, action: "approved"|"rejected", reason?, admin_name? }

عند approved: verification_status='approved', is_active=true, verified_at, verified_by
             + واتساب للمورد

عند rejected: verification_status='rejected', is_active=false, rejection_reason
             + واتساب للمورد
```

### POST /api/requests
```
يشترط: phone_verified=true في body (وفي DB عبر RLS)
المطابقة: is_active=true AND verification_status='approved' فقط
```

### POST /api/offers — طلب كشف
```
Body: { _action: "request_reveal", offer_id, session_id, requester_phone? }
ينشئ reveal_request بحالة pending + auto_approve_at = +24h
```

---

## Cron للكشف التلقائي

```sql
-- في Supabase → Database → Extensions → فعّل pg_cron
SELECT cron.schedule(
  'auto-approve-reveals',
  '*/30 * * * *',
  'SELECT auto_approve_reveals()'
);
```

---

## ما لا يوجد الآن (مقصود)

- ❌ دفع (Moyasar أو غيره)
- ❌ اشتراكات الموردين
- ❌ نفاذ
- ❌ سجل تجاري إلزامي
- ❌ KYC ثقيل
- ❌ تقييمات
- ❌ chat
- ❌ SEO pages
- ❌ referrals
- ❌ seed suppliers أو بيانات وهمية

---

## الموردون — قاعدة مهمة

**لا توجد بيانات اختبار في schema.sql.**
للاختبار الشخصي فقط:
```sql
-- احذفه قبل دعوة مشترين حقيقيين
INSERT INTO suppliers (name, city, phone, whatsapp, category_id, supplier_type,
                       verification_status, is_active)
VALUES ('اختبار', 'الرياض', '05XXXXXXXX', '05XXXXXXXX', 'cars', 'store', 'approved', true);
```
