import { Header } from '@/components/Header';
import { ComponentA } from '@/components/ComponentA';
import { ComponentB } from '@/components/ComponentB';
import { ServerOverview } from './_components/ServerOverview';
import { ServerWorkflow } from './_components/ServerWorkflow';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Header activeRoute="Home" />
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 16px 56px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ServerOverview />
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          <ComponentA
            title="Client boundary card"
            badge="client"
            description="Pick this card to verify a mounted client component with typed props and nested Badge children."
          />
          <ComponentB
            title="Runtime relation card"
            badge="runtime"
            description="Select this card in the graph to verify parent-child runtime edges and repeated child component merging."
          />
        </section>
        <ServerWorkflow />
      </main>
    </div>
  );
}
