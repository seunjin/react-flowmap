type Props = { quantity: number; onChange: (qty: number) => void; min?: number };

export function QuantityControl({ quantity, onChange, min = 1 }: Props) {
  const btn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0',
        background: disabled ? '#f8fafc' : '#fff', cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: disabled ? '#cbd5e1' : '#334155', flexShrink: 0,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {btn('−', () => onChange(quantity - 1), quantity <= min)}
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', minWidth: 20, textAlign: 'center' }}>
        {quantity}
      </span>
      {btn('+', () => onChange(quantity + 1), false)}
    </div>
  );
}
