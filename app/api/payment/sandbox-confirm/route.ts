// app/api/payment/sandbox-confirm/route.ts
// SANDBOX ONLY — simulates a successful payment without hitting Moyasar.
// Disabled automatically in production unless ALLOW_SANDBOX_CONFIRM=true.
// Remove or protect this route before going live.

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PAYMENT_PACKAGES } from '@/types';
import type { PackageType } from '@/types';

interface ConfirmBody {
  request_id:   string;
  offer_ids:    string[];
  package_type: PackageType;
  session_id:   string;
}

export async function POST(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowed      = process.env.ALLOW_SANDBOX_CONFIRM === 'true';

  if (isProduction && !allowed) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { request_id, offer_ids, package_type, session_id } = body;
  if (!request_id || !offer_ids?.length || !package_type || !session_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const pkg = PAYMENT_PACKAGES[package_type];
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package_type' }, { status: 400 });
  }

  const selectedIds   = offer_ids.slice(0, pkg.count);
  const amountHalalas = Math.round(pkg.amount_sar * 100);

  const db = getServiceClient();

  // Create a payment record marked as paid
  const { data: payment, error: payErr } = await db
    .from('payments')
    .insert({
      session_id,
      request_id,
      package_type,
      offer_count:    selectedIds.length,
      amount_halalas: amountHalalas,
      moyasar_id:     `sandbox_${Date.now()}`,
      moyasar_status: 'paid',
      payment_method: 'sandbox',
      status:         'paid',
    })
    .select()
    .single();

  if (payErr || !payment) {
    console.error('[sandbox-confirm] payment insert error:', payErr);
    return NextResponse.json({ error: 'DB error creating payment' }, { status: 500 });
  }

  // Create unlock_access rows
  const rows = selectedIds.map((oid) => ({
    payment_id: payment.id,
    offer_id:   oid,
    session_id,
  }));

  const { error: ulErr } = await db
    .from('unlock_access')
    .upsert(rows, { onConflict: 'offer_id,session_id' });

  if (ulErr) {
    console.error('[sandbox-confirm] unlock upsert error:', ulErr);
    return NextResponse.json({ error: 'DB error creating unlocks' }, { status: 500 });
  }

  return NextResponse.json({
    success:      true,
    payment_id:   payment.id,
    unlocked_ids: selectedIds,
    note:         'SANDBOX — no real payment was processed',
  });
}
