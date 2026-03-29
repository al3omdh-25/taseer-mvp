// app/api/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { CreateRequestPayload, Request } from '@/types';

// ── POST /api/requests ───────────────────────────────────────
// Create a new quote request and assign matching suppliers.
export async function POST(req: NextRequest) {
  let body: CreateRequestPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.category_id || !body.title?.trim() || !body.city?.trim()) {
    return NextResponse.json(
      { error: 'category_id, title, and city are required' },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  // 1. Insert the request (request_code set by DB trigger)
  const { data: request, error: reqErr } = await db
    .from('requests')
    .insert({
      category_id:     body.category_id,
      title:           body.title.trim(),
      specs:           body.specs?.trim() || null,
      quantity:        body.quantity?.trim() || null,
      city:            body.city.trim(),
      delivery_needed: body.delivery_needed ?? false,
      origin_pref:     body.origin_pref?.trim() || null,
      warranty_pref:   body.warranty_pref?.trim() || null,
      notes:           body.notes?.trim() || null,
      car_brand:       body.car_brand?.trim() || null,
      car_model:       body.car_model?.trim() || null,
      car_year:        body.car_year?.trim() || null,
      part_condition:  body.part_condition || null,
      requester_phone: body.requester_phone?.trim() || null,
      requester_email: body.requester_email?.trim() || null,
      session_id:      body.session_id || null,
      status:          'active',
    })
    .select()
    .single<Request>();

  if (reqErr || !request) {
    console.error('[POST /api/requests] insert error:', reqErr);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }

  // 2. Find matching suppliers (same category, active, up to 7)
  const { data: suppliers } = await db
    .from('suppliers')
    .select('id')
    .eq('category_id', body.category_id)
    .eq('is_active', true)
    .limit(7);

  // 3. Create assignment records
  if (suppliers && suppliers.length > 0) {
    const rows = suppliers.map((s: { id: string }) => ({
      request_id:  request.id,
      supplier_id: s.id,
    }));
    const { error: assignErr } = await db
      .from('request_supplier_assignments')
      .insert(rows);
    if (assignErr) {
      console.warn('[POST /api/requests] assignment error (non-fatal):', assignErr);
    }
  }

  return NextResponse.json(
    { request_code: request.request_code, request_id: request.id },
    { status: 201 }
  );
}

// ── GET /api/requests?code=TAS-XXXXXX ───────────────────────
// Fetch a single request by its public code.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Missing ?code= parameter' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('requests')
    .select('*')
    .eq('request_code', code)
    .single<Request>();

  if (error || !data) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
