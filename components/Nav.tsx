'use client';
// components/Nav.tsx
import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        تسعير <em>Taseer</em>
      </Link>
      <div className="nav-links">
        <Link href="/supplier" className="nav-link">لوحة المورد</Link>
        <Link href="/admin"    className="nav-link">الإدارة</Link>
        <Link href="/request"  className="nav-link primary">اطلب تسعيرة</Link>
      </div>
    </nav>
  );
}
