import { useRef } from 'react';

import type { DemoUser } from '../api/user';
import { demoRuntimeSession } from '../gori-runtime';

type UserCardProps = {
  user: DemoUser | null;
};

export function UserCard({ user }: UserCardProps) {
  const hasRecordedRender = useRef(false);

  if (!hasRecordedRender.current) {
    demoRuntimeSession.recordRender(
      'symbol:demo/src/pages/user-page.tsx#UserPage',
      'symbol:demo/src/components/user-card.tsx#UserCard',
      'file:demo/src/components/user-card.tsx'
    );
    hasRecordedRender.current = true;
  }

  if (!user) {
    return <p>Loading demo user...</p>;
  }

  return (
    <article
      style={{
        padding: '1rem',
        borderRadius: '0.75rem',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
      }}
    >
      <strong>{user.name}</strong>
      <p style={{ marginBottom: 0, color: '#475569' }}>Demo data loaded through `useUser`.</p>
    </article>
  );
}
