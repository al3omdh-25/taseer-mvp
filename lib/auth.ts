// lib/auth.ts
// Thin wrappers around Supabase Auth used in API routes.

import { getServiceClient } from './supabase';

/**
 * Extracts the authenticated user from a request's Authorization header.
 * Returns null if the token is missing or invalid.
 */
export async function getUserFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

/**
 * Checks whether the request carries a valid admin token.
 * Admin token is set via ADMIN_SECRET_TOKEN env var.
 */
export function isAdminRequest(req: Request): boolean {
  const header = req.headers.get('x-admin-token') ?? '';
  const secret = process.env.ADMIN_SECRET_TOKEN ?? '';
  return secret.length > 0 && header === secret;
}
