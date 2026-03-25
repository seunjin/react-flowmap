const BADGE_STYLE = {
  sale: { bg: '#fee2e2', color: '#b91c1c', label: 'SALE' },
  new:  { bg: '#dcfce7', color: '#15803d', label: 'NEW'  },
  hot:  { bg: '#fef3c7', color: '#b45309', label: 'HOT'  },
};

type Props = { badge: 'sale' | 'new' | 'hot' };

export function ProductBadge({ badge }: Props) {
  const s = BADGE_STYLE[badge];
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 800,
      background: s.bg, color: s.color, letterSpacing: '0.05em',
    }}>
      {s.label}
    </span>
  );
}
