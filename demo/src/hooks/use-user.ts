import { useEffect, useState } from 'react';

import type { DemoUser } from '../api/user';
import { fetchUser } from '../api/user';

export function useUser() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    let mounted = true;

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
