export function Spinner({ size = 20, color = '#3b82f6' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      style={{ animation: 'rfm-spin 0.7s linear infinite', display: 'block' }}
    >
      <circle cx="12" cy="12" r="10" stroke={`${color}30`} strokeWidth="3" fill="none" />
      <path
        d="M12 2 A10 10 0 0 1 22 12"
        stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}
