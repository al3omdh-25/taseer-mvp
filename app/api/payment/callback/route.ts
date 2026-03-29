// app/api/payment/callback/route.ts
// Moyasar redirects the user here after completing (or failing) payment.
// Query params are set by us in the callback_url we built in /api/payment.
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getMoyasarPayment } from '@/lib/moyasar';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const paymentDbId = p.get('payment_db_id') ?? '';
  const sessionId   = p.get('session_id')    ?? '';
  const offerIdsRaw = p.get('offer_ids')     ?? '';
  const requestId   = p.get('request_id')    ?? '';
  const moyasarId   = p.get('id')            ?? '';   // Moyasar appends ?id=xxx

  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!paymentDbId || !sessionId || !offerIdsRaw || !requestId) {
    return NextResponse.redirect(`${appUrl}/offers?request_id=${requestId}&error=invalid_callback`);
  }

  const db = getServiceClient();

  try {
    // 1. Verify payment status directly with Moyasar (don't trust query params)
    let isPaid = false;
    let actualMoyasarId = moyasarId;

    if (moyasarId) {
      const mpayment = await getMoyasarPayment(moyasarId);
      isPaid = mpayment.status === 'paid';
      actualMoyasarId = mpayment.id;

      // Update our payment record with latest status
      await db
        .from('payments')
        .update({
          moyasar_id:     actualMoyasarId,
          moyasar_status: mpayment.status,
          payment_method: mpayment.source.type,
          status:         isPaid ? 'paid' : 'failed',
        })
        .eq('id', paymentDbId);
    }

    if (isPaid) {
      // 2. Create unlock_access rows for each offer
      const offerIds = offerIdsRaw.split(',').filter(Boolean);
      const rows = offerIds.map((oid) => ({
        payment_id: paymentDbId,
        offer_id:   oid,
        session_id: sessionId,
      }));

      await db
        .from('unlock_access')
        .upsert(rows, { onConflict: 'offer_id,session_id' });

      return NextResponse.redirect(
        `${appUrl}/offers?request_id=${requestId}&session=${encodeURIComponent(sessionId)}&payment=success`
      );
    } else {
      return NextResponse.redirect(
        `${appUrl}/offers?request_id=${requestId}&session=${encodeURIComponent(sessionId)}&payment=failed`
      );
    }
  } catch (err) {
    console.error('[payment/callback] error:', err);
    return NextResponse.redirect(
      `${appUrl}/offers?request_id=${requestId}&payment=error`
    );
  }
}
