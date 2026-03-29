// lib/moyasar.ts
// Moyasar API helpers.
// Docs: https://moyasar.com/docs/api/

import { createHmac } from 'crypto';

const MOYASAR_BASE = 'https://api.moyasar.com/v1';

function authHeader(): string {
  const key = process.env.MOYASAR_API_KEY ?? '';
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

// ── Types ────────────────────────────────────────────────────

export interface MoyasarPaymentSource {
  type: 'creditcard' | 'mada' | 'applepay' | 'stcpay';
  company?: string;
  name?: string;
  number?: string;
  transaction_url?: string;
  message?: string;
}

export interface MoyasarPayment {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number;
  fee: number;
  currency: string;
  refunded: number;
  description: string;
  amount_format: string;
  fee_format: string;
  refunded_format: string;
  invoice_id: string | null;
  ip: string | null;
  callback_url: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string> | null;
  source: MoyasarPaymentSource;
}

export interface CreatePaymentOptions {
  amount_halalas: number;     // SAR × 100
  description: string;
  callback_url: string;
  metadata?: Record<string, string>;
  publishable_api_key: string;
}

// ── Create a Moyasar payment (server-side) ───────────────────
// Returns the payment object including source.transaction_url for redirect.
export async function createMoyasarPayment(
  opts: CreatePaymentOptions
): Promise<MoyasarPayment> {
  const body = {
    amount:              opts.amount_halalas,
    currency:            'SAR',
    description:         opts.description,
    callback_url:        opts.callback_url,
    publishable_api_key: opts.publishable_api_key,
    metadata:            opts.metadata ?? {},
    source: {
      type: 'creditcard',     // accepts creditcard, mada, applepay
    },
  };

  const res = await fetch(`${MOYASAR_BASE}/payments`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  authHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moyasar create payment failed: ${res.status} — ${text}`);
  }

  return res.json() as Promise<MoyasarPayment>;
}

// ── Fetch a payment by ID ────────────────────────────────────
export async function getMoyasarPayment(paymentId: string): Promise<MoyasarPayment> {
  const res = await fetch(`${MOYASAR_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moyasar fetch payment failed: ${res.status} — ${text}`);
  }

  return res.json() as Promise<MoyasarPayment>;
}

// ── Verify Moyasar webhook signature ─────────────────────────
// Moyasar sends HMAC-SHA256 of the raw request body.
export function verifyMoyasarWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET ?? '';
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
