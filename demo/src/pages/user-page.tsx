import { UserCard } from '../components/user-card';
import { useUser } from '../hooks/use-user';

export function UserPage() {
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
