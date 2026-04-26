export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {children}
    </section>
  );
}
