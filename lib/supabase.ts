// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Browser client (uses anon key, respects RLS) ─────────────
// Import this in Client Components
let _browser: SupabaseClient | null = null;
export function getBrowserClient(): SupabaseClient {
  if (!_browser) {
    _browser = createClient(supabaseUrl, supabaseAnon);
  }
  return _browser;
}

// ── Server / API route client (service role, bypasses RLS) ──
// Import this ONLY in API route handlers and Server Actions
export function getServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Convenience default export for browser usage
export const supabase = (() => {
  if (typeof window !== 'undefined') return getBrowserClient();
  // On server side, fall back to anon client (RLS enforced)
  return createClient(supabaseUrl, supabaseAnon);
})();
