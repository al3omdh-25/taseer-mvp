// app/api/offers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { CreateOfferPayload, OfferPublic } from '@/types';

// ── GET /api/offers?request_id=xxx&session=yyy ───────────────
// Returns all active offers for a request.
// Supplier contact info is hidden unless the session has a paid unlock.
export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('request_id');
  const session   = req.nextUrl.searchParams.get('session') ?? '';

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request_id' }, { status: 400 });
  }

  const db = getServiceClient();

  // Fetch offers joined with supplier trust signals
  const { data: offers, error: offErr } = await db
    .from('offers')
    .select(`
      id, created_at, request_id, price, city, origin,
      warranty, delivery, delivery_days, supplier_type, notes, status,
      suppliers (
        id, name, phone, whatsapp, city,
        is_trusted, is_fast
      )
    `)
    .eq('request_id', requestId)
    .eq('status', 'active')
    .order('price', { ascending: true });

  if (offErr) {
    console.error('[GET /api/offers] DB error:', offErr);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Fetch which offer IDs are unlocked for this session
  let unlockedIds = new Set<string>();
  if (session) {
    const { data: unlocks } = await db
      .from('unlock_access')
      .select('offer_id')
      .eq('session_id', session);
    if (unlocks) {
      unlockedIds = new Set(unlocks.map((u: { offer_id: string }) => u.offer_id));
    }
  }

  // Build public offer list — strip private data unless unlocked
  type RawOffer = {
    id: string;
    created_at: string;
    request_id: string;
    price: number;
    city: string;
    origin: string;
    warranty: string | null;
    delivery: boolean;
    delivery_days: number | null;
    supplier_type: string;
    notes: string | null;
    status: string;
    suppliers: {
      id: string;
      name: string;
      phone: string;
      whatsapp: string;
      city: string;
      is_trusted: boolean;
      is_fast: boolean;
    } | null;
  };

  const publicOffers: OfferPublic[] = (offers ?? []).map((o: RawOffer) => {
    const sup       = o.suppliers;
    const unlocked  = unlockedIds.has(o.id);

    return {
      id:                o.id,
      created_at:        o.created_at,
      updated_at:        o.created_at,
      request_id:        o.request_id,
      supplier_id:       sup?.id ?? '',
      price:             o.price,
      city:              o.city,
      origin:            o.origin,
      warranty:          o.warranty,
      delivery:          o.delivery,
      delivery_days:     o.delivery_days,
      supplier_type:     o.supplier_type as OfferPublic['supplier_type'],
      notes:             o.notes,
      status:            o.status as OfferPublic['status'],
      is_trusted:        sup?.is_trusted ?? false,
      is_fast:           sup?.is_fast    ?? false,
      is_unlocked:       unlocked,
      // Contact revealed only after payment
      supplier_name:     unlocked ? sup?.name     : undefined,
      supplier_phone:    unlocked ? sup?.phone    : undefined,
      supplier_whatsapp: unlocked ? sup?.whatsapp : undefined,
      supplier_city:     unlocked ? sup?.city     : undefined,
    };
  });

  return NextResponse.json(publicOffers);
}

// ── POST /api/offers ─────────────────────────────────────────
// Supplier submits a price offer for an assigned request.
export async function POST(req: NextRequest) {
  let body: CreateOfferPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.request_id || !body.supplier_id || !body.price || !body.city || !body.origin) {
    return NextResponse.json(
      { error: 'request_id, supplier_id, price, city, origin are required' },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  // Verify supplier is assigned to this request
  const { data: assignment } = await db
    .from('request_supplier_assignments')
    .select('id')
    .eq('request_id', body.request_id)
    .eq('supplier_id', body.supplier_id)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json(
      { error: 'Supplier is not assigned to this request' },
      { status: 403 }
    );
  }

  // Check supplier hasn't already submitted for this request
  const { data: existing } = await db
    .from('offers')
    .select('id')
    .eq('request_id', body.request_id)
    .eq('supplier_id', body.supplier_id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You have already submitted an offer for this request' },
      { status: 409 }
    );
  }

  // Fetch supplier's type for denormalization
  const { data: supplier } = await db
    .from('suppliers')
    .select('supplier_type')
    .eq('id', body.supplier_id)
    .single();

  const { data: offer, error: offerErr } = await db
    .from('offers')
    .insert({
      request_id:    body.request_id,
      supplier_id:   body.supplier_id,
      price:         Number(body.price),
      city:          body.city.trim(),
      origin:        body.origin.trim(),
      warranty:      body.warranty?.trim() || null,
      delivery:      body.delivery ?? false,
      delivery_days: body.delivery_days ? Number(body.delivery_days) : null,
      supplier_type: supplier?.supplier_type ?? body.supplier_type,
      notes:         body.notes?.trim() || null,
      status:        'active',
    })
    .select()
    .single();

  if (offerErr || !offer) {
    console.error('[POST /api/offers] insert error:', offerErr);
    return NextResponse.json({ error: 'Failed to submit offer' }, { status: 500 });
  }

  return NextResponse.json(offer, { status: 201 });
}
