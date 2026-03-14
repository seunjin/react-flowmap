export type DemoUser = {
  id: string;
  name: string;
};

import { withRuntimeContext } from '../runtime-context';

export async function fetchUser(): Promise<DemoUser> {
  return withRuntimeContext(
    {
      sourceSymbolId: 'symbol:demo/src/api/user.ts#fetchUser',
      traceId: 'demo-trace',
      sessionId: 'demo-session',
    },
    async () => {
      const response = await fetch('/api/user');
      return (await response.json()) as DemoUser;
    }
  );
}
