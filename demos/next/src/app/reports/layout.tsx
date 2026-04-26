export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      {children}
    </section>
  );
}
