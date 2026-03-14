import { useEffect, useRef, useState } from 'react';

import type { DemoUser } from '../api/user';
import { fetchUser } from '../api/user';
import { demoRuntimeSession } from '../gori-runtime';

export function useUser() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const hasRecordedCall = useRef(false);

  useEffect(() => {
    let mounted = true;

    if (!hasRecordedCall.current) {
      demoRuntimeSession.recordCall(
        'symbol:demo/src/hooks/use-user.ts#useUser',
        'symbol:demo/src/api/user.ts#fetchUser'
      );
      hasRecordedCall.current = true;
    }

    void fetchUser().then((result) => {
      if (mounted) {
        setUser(result);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return user;
}
