// app/api/payment/webhook/route.ts
// Moyasar calls this endpoint server-to-server when a payment status changes.
// Configure this URL in: Moyasar Dashboard → Webhooks → Add Endpoint
//   URL: https://your-app.vercel.app/api/payment/webhook

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { verifyMoyasarWebhook } from '@/lib/moyasar';

export async function POST(req: NextRequest) {
  // 1. Read raw body for signature verification
  const rawBody  = await req.text();
  const signature = req.headers.get('x-moyasar-signature') ?? '';

  // 2. Verify signature
  if (!verifyMoyasarWebhook(rawBody, signature)) {
    console.warn('[webhook] Invalid Moyasar signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: {
    type: string;
    data: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata: Record<string, string> | null;
      source: { type: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // We only care about payment.paid
  if (event.type !== 'payment.paid') {
    return NextResponse.json({ received: true });
  }

  const { id: moyasarId, status, metadata, source } = event.data;
  if (status !== 'paid' || !metadata) {
    return NextResponse.json({ received: true });
  }

  const paymentDbId = metadata.payment_db_id;
  const sessionId   = metadata.session_id;
  const offerIds    = (metadata.offer_ids ?? '').split(',').filter(Boolean);

  if (!paymentDbId || !sessionId || !offerIds.length) {
    console.warn('[webhook] Missing metadata fields');
    return NextResponse.json({ received: true });
  }

  const db = getServiceClient();

  // 3. Update payment record
  await db
    .from('payments')
    .update({
      status:         'paid',
      moyasar_id:     moyasarId,
      moyasar_status: status,
      payment_method: source.type,
    })
    .eq('id', paymentDbId);

  // 4. Upsert unlock_access rows
  const rows = offerIds.map((oid) => ({
    payment_id: paymentDbId,
    offer_id:   oid,
    session_id: sessionId,
  }));

  const { error: ulErr } = await db
    .from('unlock_access')
    .upsert(rows, { onConflict: 'offer_id,session_id' });

  if (ulErr) {
    console.error('[webhook] unlock upsert error:', ulErr);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  console.info(`[webhook] Unlocked ${offerIds.length} offers for session ${sessionId}`);
  return NextResponse.json({ received: true });
}
