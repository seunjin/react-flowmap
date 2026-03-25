import { Header } from '@/components/Header';
import { ComponentA } from '@/components/ComponentA';
import { ComponentB } from '@/components/ComponentB';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Header />
      <main style={{ maxWidth: 672, margin: '0 auto', padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ComponentA />
        <ComponentB />
      </main>
    </div>
  );
}
