type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary:   { bg: '#3b82f6',    color: '#fff',     border: 'transparent', hoverBg: '#2563eb'  },
  secondary: { bg: '#f1f5f9',    color: '#0f172a',  border: '#e2e8f0',     hoverBg: '#e2e8f0'  },
  ghost:     { bg: 'transparent', color: '#64748b', border: 'transparent', hoverBg: '#f1f5f9'  },
  danger:    { bg: '#fee2e2',    color: '#b91c1c',  border: 'transparent', hoverBg: '#fecaca'  },
};

const SIZES: Record<Size, { padding: string; fontSize: number; borderRadius: number }> = {
  sm: { padding: '4px 10px',  fontSize: 11, borderRadius: 6 },
  md: { padding: '8px 14px',  fontSize: 13, borderRadius: 8 },
  lg: { padding: '12px 18px', fontSize: 14, borderRadius: 8 },
};

export function Button({
  children, variant = 'primary', size = 'md', fullWidth,
  onClick, disabled, loading, type = 'button',
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}) {
  const s  = VARIANTS[variant];
  const sz = SIZES[size];
  const off = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: sz.padding, borderRadius: sz.borderRadius,
        border: `1px solid ${s.border}`,
        background: off ? '#f1f5f9' : s.bg,
        color:      off ? '#94a3b8' : s.color,
        fontSize: sz.fontSize, fontWeight: 600,
        cursor: off ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'all 120ms', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!off) (e.currentTarget as HTMLElement).style.background = s.hoverBg; }}
      onMouseLeave={e => { if (!off) (e.currentTarget as HTMLElement).style.background = s.bg; }}
    >
      {loading ? '···' : children}
    </button>
  );
}
