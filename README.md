# تسعير – Taseer MVP

A quote-request marketplace for the Saudi market.  
Buyers submit requests → suppliers send offers → buyers pay a small fee to unlock supplier contact details.

**Core flow:** Request → Offers → Payment → Unlock Supplier Contact

---

## What is implemented vs mocked

| Feature | Status |
|---|---|
| Request wizard (all categories + car parts) | ✅ Real |
| Supplier matching by category | ✅ Real |
| Offers from suppliers | ✅ Real |
| Contact info hidden before payment | ✅ Real |
| Payment – Moyasar Sandbox | ✅ Sandbox (switch to live with one key change) |
| Payment – webhook verification | ✅ Real (HMAC-SHA256) |
| Unlock access stored in DB | ✅ Real |
| Supplier registration | ✅ Real |
| Admin dashboard | ✅ Real |
| Supabase RLS policies | ✅ Real |
| User authentication (login/signup) | ⚠️ Anonymous session only – add Supabase Auth for production |
| Email / SMS notifications | ⚠️ Not implemented – add Resend or Twilio |
| Supplier verification | ⚠️ Manual – no automated KYC |

---

## Tech stack

- **Frontend + API:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Row Level Security)
- **Payment:** Moyasar (Sandbox → Live by swapping API key)
- **Deployment:** Vercel

---

## Prerequisites

Before you start you need free accounts at:

1. [supabase.com](https://supabase.com) — database
2. [vercel.com](https://vercel.com) — hosting
3. [dashboard.moyasar.com](https://dashboard.moyasar.com) — payment gateway
4. [github.com](https://github.com) — to push the code

---

## Step 1 — Set up Supabase

### 1.1 Create a project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose a name (e.g. `taseer`), set a strong database password, pick the **Middle East** region.
4. Wait ~2 minutes for the project to be ready.

### 1.2 Run the schema

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `schema.sql` from this project, copy the entire contents, paste into the editor.
4. Click **Run** (or press Ctrl+Enter).
5. You should see "Success. No rows returned." — this means all tables, indexes, RLS policies, triggers, and seed data were created.

### 1.3 Get your API keys

1. Click **Settings** → **API** in the left sidebar.
2. Copy these three values — you will need them in Step 3:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It is only used in API routes.

---

## Step 2 — Set up Moyasar (Sandbox)

### 2.1 Create an account

1. Go to [dashboard.moyasar.com](https://dashboard.moyasar.com) and register.
2. Your account starts in **Sandbox mode** automatically.

### 2.2 Get your API keys

1. In Moyasar Dashboard, go to **Settings → API Keys**.
2. Copy the **Secret Key** (starts with `sk_test_`).  
   This goes into `MOYASAR_API_KEY`.

### 2.3 Set up webhook

1. In Moyasar Dashboard, go to **Settings → Webhooks**.
2. Click **Add Endpoint**.
3. URL: `https://your-app.vercel.app/api/payment/webhook`  
   (you will update this with the real Vercel URL after deployment)
4. Select event: **payment.paid**
5. Copy the **Webhook Secret** → `MOYASAR_WEBHOOK_SECRET`

### 2.4 Test cards (Sandbox)

| Card number | Result |
|---|---|
| `4111 1111 1111 1111` | Success |
| `4000 0000 0000 0002` | Declined |

Use any future expiry date and any 3-digit CVV.

---

## Step 3 — Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in all values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Moyasar
MOYASAR_API_KEY=sk_test_...
MOYASAR_WEBHOOK_SECRET=whsec_...

# App URL (use localhost for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin panel token (change this to a long random string)
ADMIN_SECRET_TOKEN=taseer-admin-dev
```

---

## Step 4 — Run locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local test flow

1. Go to [http://localhost:3000](http://localhost:3000)
2. Click **اطلب تسعيرة** and complete the wizard
3. Note the request code shown on the success page
4. Go to [http://localhost:3000/offers?request_id=YOUR_ID](http://localhost:3000/offers)
5. You will see no offers yet (you are the buyer)
6. Open a new tab: [http://localhost:3000/supplier](http://localhost:3000/supplier)
7. Register as a supplier in the same category as your request
8. Submit a price offer
9. Go back to the offers page — you should see the offer
10. Click **اكشف بيانات المورد** — in sandbox mode, no real payment is charged
11. Supplier contact info appears

---

## Step 5 — Deploy to Vercel

### 5.1 Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taseer-mvp.git
git push -u origin main
```

### 5.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**.
3. Import your GitHub repository.
4. Vercel auto-detects Next.js — no configuration needed.

### 5.3 Add environment variables

In the Vercel project settings, go to **Settings → Environment Variables** and add all variables from `.env.local`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key |
| `MOYASAR_API_KEY` | `sk_test_...` |
| `MOYASAR_WEBHOOK_SECRET` | your Moyasar webhook secret |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `ADMIN_SECRET_TOKEN` | a long random string |

### 5.4 Deploy

Click **Deploy**. Vercel builds and deploys automatically (~2 minutes).

Your live URL will be: `https://your-app-name.vercel.app`

### 5.5 Update Moyasar webhook URL

Go back to Moyasar Dashboard → Webhooks → update the URL to:  
`https://your-app-name.vercel.app/api/payment/webhook`

---

## Step 6 — Switch to live payments

When you are ready to accept real payments:

1. In Moyasar Dashboard, complete KYC verification.
2. Get your **Live Secret Key** (starts with `sk_live_`).
3. In Vercel → Settings → Environment Variables, update:
   - `MOYASAR_API_KEY` → `sk_live_...`
4. Redeploy (Vercel redeploys automatically on env var change).

That is the only change needed. All payment logic stays the same.

---

## Project structure

```
taseer-mvp/
├── app/
│   ├── api/
│   │   ├── requests/route.ts       POST create request, GET by code
│   │   ├── offers/route.ts         GET offers (with unlock), POST submit offer
│   │   ├── payment/
│   │   │   ├── route.ts            POST initiate Moyasar payment
│   │   │   ├── callback/route.ts   GET Moyasar redirect after payment
│   │   │   ├── webhook/route.ts    POST Moyasar server webhook
│   │   │   └── sandbox-confirm/    POST simulate payment (dev only)
│   │   ├── suppliers/route.ts      POST register, GET assigned requests
│   │   └── admin/route.ts          GET dashboard data (token protected)
│   ├── page.tsx                    Homepage
│   ├── request/page.tsx            Request wizard
│   ├── success/page.tsx            Post-request success screen
│   ├── offers/page.tsx             Offers list + payment unlock
│   ├── supplier/page.tsx           Supplier registration + dashboard
│   ├── admin/page.tsx              Admin dashboard
│   └── layout.tsx                  Root layout
├── components/
│   ├── Nav.tsx                     Navbar
│   ├── Footer.tsx                  Footer
│   ├── OfferCard.tsx               Single offer card with lock/unlock
│   └── PaymentModal.tsx            Payment package selector + Moyasar
├── lib/
│   ├── supabase.ts                 Browser + service role clients
│   ├── session.ts                  Anonymous session ID helper
│   ├── auth.ts                     Auth helpers for API routes
│   └── moyasar.ts                  Moyasar API + webhook verification
├── types/
│   └── index.ts                    All shared TypeScript types
├── styles/
│   └── globals.css                 Complete stylesheet (RTL Arabic)
├── schema.sql                      Full Supabase schema + RLS + seed data
├── .env.example                    All required environment variables
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## Admin panel

URL: `/admin`  
Default dev token: `taseer-admin-dev`

Change `ADMIN_SECRET_TOKEN` in your environment variables before going live.

The admin panel shows:
- Overview KPIs (requests, suppliers, offers, revenue)
- All requests table
- All suppliers table  
- All offers table (with supplier name, joined)
- All payments table (with Moyasar ID and status)

---

## Sandbox mode behavior

In `NODE_ENV=development` (local), the payment modal calls `/api/payment/sandbox-confirm` instead of Moyasar. This creates a real `payments` record and real `unlock_access` rows in the database — marked as `payment_method: sandbox`.

In production (`NODE_ENV=production`), it calls `/api/payment` which creates a Moyasar session and redirects to their hosted payment page.

To test sandbox in production (e.g. on Vercel staging), set:  
`ALLOW_SANDBOX_CONFIRM=true`

---

## Hardening checklist before go-live

- [ ] Change `ADMIN_SECRET_TOKEN` to a long random string (`openssl rand -hex 32`)
- [ ] Switch Moyasar to live key
- [ ] Remove or disable `/api/payment/sandbox-confirm` route
- [ ] Add rate limiting to `/api/requests` (prevent spam — e.g. 3 requests per IP per hour)
- [ ] Add Supabase Auth so buyers can track their own requests by account
- [ ] Add SMS notifications (Twilio or Unifonic) when offers arrive
- [ ] Set up Supabase backups (Settings → Database → Backups)
- [ ] Add error tracking (Sentry)

---

## Support

For deployment questions, open an issue or contact the development team.
