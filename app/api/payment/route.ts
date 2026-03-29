// app/api/payment/route.ts
// POST /api/payment  — create a Moyasar payment session
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { createMoyasarPayment } from '@/lib/moyasar';
import { PAYMENT_PACKAGES } from '@/types';
import type { PackageType } from '@/types';

interface PaymentInitBody {
  request_id:   string;
  offer_ids:    string[];    // which offers to unlock
  package_type: PackageType;
  session_id:   string;
}

export async function POST(req: NextRequest) {
  let body: PaymentInitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { request_id, offer_ids, package_type, session_id } = body;

  if (!request_id || !offer_ids?.length || !package_type || !session_id) {
    return NextResponse.json(
      { error: 'request_id, offer_ids, package_type, session_id are required' },
      { status: 400 }
    );
  }

  const pkg = PAYMENT_PACKAGES[package_type];
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package_type' }, { status: 400 });
  }

  // Clamp offer_ids to the package count
  const selectedIds = offer_ids.slice(0, pkg.count);
  const amountHalalas = Math.round(pkg.amount_sar * 100);

  const db = getServiceClient();

  // 1. Create a pending payment record
  const { data: payment, error: payErr } = await db
    .from('payments')
    .insert({
      session_id,
      request_id,
      package_type,
      offer_count:    selectedIds.length,
      amount_halalas: amountHalalas,
      status:         'pending',
    })
    .select()
    .single();

  if (payErr || !payment) {
    console.error('[POST /api/payment] insert error:', payErr);
    return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
  }

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const callbackUrl =
    `${appUrl}/api/payment/callback` +
    `?payment_db_id=${payment.id}` +
    `&session_id=${encodeURIComponent(session_id)}` +
    `&offer_ids=${encodeURIComponent(selectedIds.join(','))}` +
    `&request_id=${request_id}`;

  // 2. Create Moyasar payment
  //    In sandbox the publishable key is the same as the secret key prefix.
  const publishableKey = (process.env.MOYASAR_API_KEY ?? '').replace('sk_', 'pk_');

  let moyasarPayment;
  try {
    moyasarPayment = await createMoyasarPayment({
      amount_halalas:      amountHalalas,
      description:         `Taseer – فتح ${selectedIds.length} عرض أسعار`,
      callback_url:        callbackUrl,
      publishable_api_key: publishableKey,
      metadata: {
        payment_db_id: payment.id,
        session_id,
        request_id,
        offer_ids:    selectedIds.join(','),
        package_type,
      },
    });
  } catch (err) {
    console.error('[POST /api/payment] Moyasar error:', err);
    // Save Moyasar error on payment record
    await db
      .from('payments')
      .update({ status: 'failed', moyasar_status: 'moyasar_unavailable' })
      .eq('id', payment.id);

    return NextResponse.json(
      { error: 'Payment gateway error. Please try again.' },
      { status: 502 }
    );
  }

  // 3. Persist Moyasar payment ID
  await db
    .from('payments')
    .update({ moyasar_id: moyasarPayment.id, moyasar_status: moyasarPayment.status })
    .eq('id', payment.id);

  return NextResponse.json({
    payment_db_id:   payment.id,
    moyasar_id:      moyasarPayment.id,
    payment_url:     moyasarPayment.source.transaction_url ?? null,
    amount_sar:      pkg.amount_sar,
    status:          moyasarPayment.status,
  });
}
