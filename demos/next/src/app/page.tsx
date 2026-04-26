import { Header } from '@/components/Header';
import { ServerOverview } from './_components/ServerOverview';
import { ServerWorkflow } from './_components/ServerWorkflow';

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <Header activeRoute="Dashboard" />
      <main style={{ width: 'min(1120px, calc(100vw - 32px))', margin: '0 auto', padding: '34px 0 72px' }}>
        <div style={{ display: 'grid', gap: 30 }}>
          <ServerOverview />
          <ServerWorkflow />
        </div>
      </main>
    </div>
  );
}
