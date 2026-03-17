import { useEffect, useState, useCallback } from 'react';
import type { CartItem as CartItemType } from '../shared/types';
import { fetchCart, updateCartItem, removeCartItem } from '../shared/api/cart-api';
import { Spinner } from '../shared/ui/spinner';
import { EmptyState } from '../shared/ui/empty-state';
import { Button } from '../shared/ui/button';
import { CartItem } from '../entities/cart/cart-item';

export function CartSummary() {
  const [items, setItems] = useState<CartItemType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchCart();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="장바구니가 비었습니다"
        description="홈에서 마음에 드는 상품을 담아보세요"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map(item => (
        <CartItem key={item.id} item={item} onChangeQty={handleQtyChange} onRemove={handleRemove} />
      ))}

      <div style={{ marginTop: 20, padding: '16px', borderRadius: 10, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>상품 {items.length}종</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₩{total.toLocaleString()}</span>
        </div>
        <Button variant="primary" size="lg" fullWidth>
          결제하기
        </Button>
      </div>
    </div>
  );
}
