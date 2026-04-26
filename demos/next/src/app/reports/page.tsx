import { Header } from '@/components/Header';
import { ServerReport } from '../_components/ServerReport';

export default function ReportsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <Header activeRoute="Reports" />
      <main style={{ width: 'min(1120px, calc(100vw - 32px))', margin: '0 auto', padding: '34px 0 72px' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 780, color: '#111827' }}>
              Weekly component report
            </h2>
            <p style={{ margin: '10px 0 0', maxWidth: 720, fontSize: 14, lineHeight: 1.65, color: '#5b6472' }}>
              The second route keeps the same UI primitives while changing the active route subtree.
            </p>
          </div>
          <ServerReport />
        </div>
      </main>
    </div>
  );
}
