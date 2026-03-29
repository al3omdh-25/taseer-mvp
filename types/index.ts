// types/index.ts
// Shared TypeScript types for the Taseer MVP

export type SupplierType = 'company' | 'store' | 'trader' | 'agent';
export type RequestStatus = 'active' | 'closed' | 'expired';
export type OfferStatus = 'active' | 'withdrawn';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PackageType = 'single' | 'triple' | 'bundle';
export type PartCondition = 'new' | 'used' | 'original' | 'aftermarket';
export type UserRole = 'buyer' | 'supplier' | 'admin';

// ── Category ────────────────────────────────────────────────
export interface Category {
  id: string;
  label_ar: string;
  icon: string;
  sort_order: number;
}

// ── Supplier ────────────────────────────────────────────────
export interface Supplier {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  name: string;
  city: string;
  phone: string;
  whatsapp: string;
  category_id: string;
  supplier_type: SupplierType;
  is_trusted: boolean;
  is_fast: boolean;
  is_active: boolean;
  notes: string | null;
}

// Supplier data safe to expose before payment unlock
export interface SupplierPublic {
  id: string;
  city: string;
  category_id: string;
  supplier_type: SupplierType;
  is_trusted: boolean;
  is_fast: boolean;
}

// ── Request ─────────────────────────────────────────────────
export interface Request {
  id: string;
  created_at: string;
  updated_at: string;
  request_code: string;
  user_id: string | null;
  session_id: string | null;
  category_id: string;
  title: string;
  specs: string | null;
  quantity: string | null;
  city: string;
  delivery_needed: boolean;
  origin_pref: string | null;
  warranty_pref: string | null;
  notes: string | null;
  car_brand: string | null;
  car_model: string | null;
  car_year: string | null;
  part_condition: PartCondition | null;
  requester_phone: string | null;
  requester_email: string | null;
  status: RequestStatus;
}

// Fields needed to create a new request (from wizard)
export interface CreateRequestPayload {
  category_id: string;
  title: string;
  specs?: string;
  quantity?: string;
  city: string;
  delivery_needed: boolean;
  origin_pref?: string;
  warranty_pref?: string;
  notes?: string;
  car_brand?: string;
  car_model?: string;
  car_year?: string;
  part_condition?: PartCondition;
  requester_phone?: string;
  requester_email?: string;
  session_id: string;
}

// ── Offer ───────────────────────────────────────────────────
export interface Offer {
  id: string;
  created_at: string;
  updated_at: string;
  request_id: string;
  supplier_id: string;
  price: number;
  city: string;
  origin: string;
  warranty: string | null;
  delivery: boolean;
  delivery_days: number | null;
  supplier_type: SupplierType;
  notes: string | null;
  status: OfferStatus;
}

// Offer enriched with supplier trust signals (no contact info)
export interface OfferPublic extends Offer {
  is_trusted: boolean;
  is_fast: boolean;
  is_unlocked: boolean;
  // Present only when is_unlocked === true
  supplier_name?: string;
  supplier_phone?: string;
  supplier_whatsapp?: string;
  supplier_city?: string;
}

// Fields needed to submit an offer (from supplier panel)
export interface CreateOfferPayload {
  request_id: string;
  supplier_id: string;
  price: number;
  city: string;
  origin: string;
  warranty?: string;
  delivery: boolean;
  delivery_days?: number;
  supplier_type: SupplierType;
  notes?: string;
}

// ── Payment ─────────────────────────────────────────────────
export interface Payment {
  id: string;
  created_at: string;
  updated_at: string;
  session_id: string;
  user_id: string | null;
  request_id: string;
  package_type: PackageType;
  offer_count: number;
  amount_halalas: number;
  amount_sar: number;
  moyasar_id: string | null;
  moyasar_status: string | null;
  payment_method: string | null;
  status: PaymentStatus;
}

// ── Unlock Access ────────────────────────────────────────────
export interface UnlockAccess {
  id: string;
  created_at: string;
  payment_id: string;
  offer_id: string;
  session_id: string;
  user_id: string | null;
}

// ── Payment packages ────────────────────────────────────────
export const PAYMENT_PACKAGES: Record<PackageType, { count: number; amount_sar: number; label_ar: string }> = {
  single: { count: 1,  amount_sar: 1.99,  label_ar: 'عرض واحد' },
  triple: { count: 3,  amount_sar: 5.99,  label_ar: '3 عروض'   },
  bundle: { count: 10, amount_sar: 14.99, label_ar: '10 عروض'  },
};

// ── API response wrappers ───────────────────────────────────
export interface ApiSuccess<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Admin dashboard ─────────────────────────────────────────
export interface AdminOverview {
  total_requests: number;
  active_requests: number;
  total_suppliers: number;
  active_suppliers: number;
  total_offers: number;
  total_payments: number;
  total_revenue_sar: number;
}
