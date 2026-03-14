import { useRef } from 'react';

import { demoRuntimeSession } from '../gori-runtime';
import { UserCard } from '../components/user-card';
import { useUser } from '../hooks/use-user';

export function UserPage() {
  const hasRecordedUse = useRef(false);

  if (!hasRecordedUse.current) {
    demoRuntimeSession.recordUse(
      'symbol:demo/src/pages/user-page.tsx#UserPage',
      'symbol:demo/src/hooks/use-user.ts#useUser'
    );
    hasRecordedUse.current = true;
  }

  const user = useUser();

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Runtime Flow Demo</h2>
      <p style={{ color: '#475569' }}>
        This page intentionally mirrors the seed architecture flow: component -&gt; hook -&gt;
        function.
      </p>
      <UserCard user={user} />
    </section>
  );
}
