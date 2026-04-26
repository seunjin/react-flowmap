import { Header } from '@/components/Header';
import { ServerReport } from '../_components/ServerReport';

export default function ReportsPage() {
  return (
    <div>
      <Header activeRoute="Reports" />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 16px 56px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 750, color: '#111827' }}>Reports route</h2>
          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.7, color: '#4b5563' }}>
            This route exists to verify active route switching, nested layout context, and a
            different server-to-client ownership chain.
          </p>
        </div>
        <ServerReport />
      </main>
    </div>
  );
}
