// app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import type { Supplier, SupplierType } from '@/types';

// ── POST /api/suppliers ──────────────────────────────────────
// Register a new supplier.
export async function POST(req: NextRequest) {
  let body: {
    name: string;
    city: string;
    phone: string;
    whatsapp?: string;
    category_id: string;
    supplier_type?: SupplierType;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim() || !body.city?.trim() || !body.phone?.trim() || !body.category_id) {
    return NextResponse.json(
      { error: 'name, city, phone, category_id are required' },
      { status: 400 }
    );
  }

  const db = getServiceClient();

  const { data: supplier, error } = await db
    .from('suppliers')
    .insert({
      name:          body.name.trim(),
      city:          body.city.trim(),
      phone:         body.phone.trim(),
      whatsapp:      body.whatsapp?.trim() || body.phone.trim(),
      category_id:   body.category_id,
      supplier_type: body.supplier_type ?? 'store',
      notes:         body.notes?.trim() || null,
      is_active:     true,
    })
    .select()
    .single<Supplier>();

  if (error || !supplier) {
    console.error('[POST /api/suppliers] insert error:', error);
    return NextResponse.json({ error: 'Failed to register supplier' }, { status: 500 });
  }

  return NextResponse.json({ supplier_id: supplier.id }, { status: 201 });
}

// ── GET /api/suppliers?supplier_id=xxx ───────────────────────
// Fetch requests assigned to a supplier.
export async function GET(req: NextRequest) {
  const supplierId = req.nextUrl.searchParams.get('supplier_id');
  if (!supplierId) {
    return NextResponse.json({ error: 'Missing supplier_id' }, { status: 400 });
  }

  const db = getServiceClient();

  // Fetch assigned requests (newest first)
  const { data, error } = await db
    .from('request_supplier_assignments')
    .select(`
      request_id,
      requests (
        id, request_code, category_id, title, city,
        quantity, delivery_needed, status, created_at,
        car_brand, car_model, car_year, part_condition
      )
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GET /api/suppliers] DB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const requests = (data ?? []).map((row: { requests: unknown }) => row.requests);
  return NextResponse.json(requests);
}
