import { createFileRoute } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { ComponentA } from '../components/ComponentA';
import { ComponentB } from '../components/ComponentB';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-6">
        <ComponentA />
        <ComponentB />
      </main>
    </div>
  );
}
