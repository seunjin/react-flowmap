type Props = { price: number; originalPrice?: number; size?: 'sm' | 'md' | 'lg' };

export function ProductPrice({ price, originalPrice, size = 'md' }: Props) {
  const fs = size === 'sm' ? 12 : size === 'lg' ? 20 : 14;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: fs, fontWeight: 700, color: '#0f172a' }}>
        ₩{price.toLocaleString()}
      </span>
      {originalPrice && (
        <span style={{ fontSize: fs - 2, color: '#94a3b8', textDecoration: 'line-through' }}>
          ₩{originalPrice.toLocaleString()}
        </span>
      )}
    </div>
  );
}
