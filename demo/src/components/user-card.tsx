import type { DemoUser } from '../api/user';

type UserCardProps = {
  user: DemoUser | null;
};

export function UserCard({ user }: UserCardProps) {
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
