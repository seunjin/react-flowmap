export function StarIcon({ filled, size = 13 }: { filled: boolean; size?: number }) {
  const color = filled ? '#f59e0b' : '#e2e8f0';
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M6.5 1L7.99 4.3l3.51.51-2.54 2.48.6 3.5L6.5 9.1 2.94 10.79l.6-3.5L1 4.81l3.51-.51L6.5 1z"
        fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round"
      />
    </svg>
  );
}
