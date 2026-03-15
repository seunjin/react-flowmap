import { useEffect, useState, useCallback } from 'react';
import type { CartItem as CartItemType } from '../shared/types';
import { fetchCart, updateCartItem, removeCartItem } from '../shared/api/cart-api';
import { CartItem } from '../entities/cart/cart-item';

type Props = { refreshKey: number };

export function CartSummary({ refreshKey }: Props) {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchCart();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function handleQtyChange(id: string, qty: number) {
    await updateCartItem(id, qty);
    await load();
  }

  async function handleRemove(id: string) {
    await removeCartItem(id);
    await load();
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: 13 }}>불러오는 중...</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 48 }}>🛒</div>
        <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>장바구니가 비었습니다</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 상품 목록 */}
      {items.map(item => (
        <CartItem key={item.id} item={item} onChangeQty={handleQtyChange} onRemove={handleRemove} />
      ))}

      {/* 합계 */}
      <div style={{ marginTop: 20, padding: '16px', borderRadius: 10, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>상품 {items.length}종</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₩{total.toLocaleString()}</span>
        </div>
        <button
          type="button"
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          결제하기
        </button>
      </div>
    </div>
  );
}
