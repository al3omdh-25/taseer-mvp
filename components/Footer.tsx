// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="footer">
      <strong>تسعير – Taseer</strong> · منصة طلب عروض الأسعار من الموردين
      <br />
      <span style={{ marginTop: 5, display: 'block' }}>
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} · المملكة العربية السعودية
      </span>
    </footer>
  );
}
