type Props = {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
};

export function CategoryFilter({ categories, active, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat)}
          style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid',
            borderColor: active === cat ? '#3b82f6' : '#e2e8f0',
            background: active === cat ? '#eff6ff' : '#fff',
            color: active === cat ? '#1d4ed8' : '#64748b',
            fontSize: 12, fontWeight: active === cat ? 600 : 400, cursor: 'pointer',
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
