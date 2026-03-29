// app/api/admin/route.ts
// Protected admin data endpoint.
// Requires header:  x-admin-token: <ADMIN_SECRET_TOKEN>
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';
import type { AdminOverview } from '@/types';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') ?? 'overview';
  const db   = getServiceClient();

  // ── overview ───────────────────────────────────────────────
  if (type === 'overview') {
    const [reqRes, supRes, offRes, payRes] = await Promise.all([
      db.from('requests').select('id, status'),
      db.from('suppliers').select('id, is_active'),
      db.from('offers').select('id'),
      db.from('payments').select('amount_sar, status').eq('status', 'paid'),
    ]);

    const totalRevenue = (payRes.data ?? []).reduce(
      (sum: number, p: { amount_sar: number }) => sum + Number(p.amount_sar ?? 0),
      0
    );

    const overview: AdminOverview = {
      total_requests:    reqRes.data?.length ?? 0,
      active_requests:   reqRes.data?.filter((r: { status: string }) => r.status === 'active').length ?? 0,
      total_suppliers:   supRes.data?.length ?? 0,
      active_suppliers:  supRes.data?.filter((s: { is_active: boolean }) => s.is_active).length ?? 0,
      total_offers:      offRes.data?.length ?? 0,
      total_payments:    payRes.data?.length ?? 0,
      total_revenue_sar: totalRevenue,
    };

    return NextResponse.json(overview);
  }

  // ── requests ───────────────────────────────────────────────
  if (type === 'requests') {
    const { data, error } = await db
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // ── suppliers ──────────────────────────────────────────────
  if (type === 'suppliers') {
    const { data, error } = await db
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // ── offers ─────────────────────────────────────────────────
  if (type === 'offers') {
    const { data, error } = await db
      .from('offers')
      .select(`
        *,
        requests (request_code, title, city),
        suppliers (name, city, phone)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // ── payments ───────────────────────────────────────────────
  if (type === 'payments') {
    const { data, error } = await db
      .from('payments')
      .select(`
        *,
        requests (request_code, title)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
