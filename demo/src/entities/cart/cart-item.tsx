import type { CartItem as CartItemType } from '../../shared/types';
import { QuantityControl } from '../../features/quantity-control';

type Props = {
  item: CartItemType;
  onChangeQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
};

export function CartItem({ item, onChangeQty, onRemove }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 8, background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
      }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          ₩{item.price.toLocaleString()} × {item.quantity}
        </div>
      </div>
      <QuantityControl
        quantity={item.quantity}
        onChange={(qty) => onChangeQty(item.id, qty)}
      />
      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', minWidth: 60, textAlign: 'right' }}>
        ₩{(item.price * item.quantity).toLocaleString()}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: 4 }}
      >
        ✕
      </button>
    </div>
  );
}
