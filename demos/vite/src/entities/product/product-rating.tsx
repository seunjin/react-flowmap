import { StarIcon } from './star-icon';

export function ProductRating({ score, count }: { score: number; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon key={i} filled={i <= Math.round(score)} />
      ))}
      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 3 }}>
        {score.toFixed(1)} ({count.toLocaleString()})
      </span>
    </div>
  );
}
