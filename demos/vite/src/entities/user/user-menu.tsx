import type { User } from '../../shared/types';

type Props = { user: User | null };

export function UserMenu({ user }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {user?.name?.[0] ?? '?'}
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>
        {user?.name ?? '...'}
      </span>
    </div>
  );
}
