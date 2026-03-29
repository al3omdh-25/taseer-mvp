// lib/session.ts
// Provides a stable anonymous session ID stored in localStorage.
// Used to track buyers who haven't signed up yet.
// Replace with Supabase Auth user IDs when auth is fully implemented.

const KEY = 'taseer_sid';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid =
      'sid_' +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
