import { useState } from 'react';
import type { Product } from '../shared/types';
import { addToCart } from '../shared/api/cart-api';
import { QuantityControl } from './quantity-control';

type Props = { product: Product; onAdded: () => void };

export function AddToCart({ product, onAdded }: Props) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    await addToCart(product.id, qty);
    setLoading(false);
    setAdded(true);
    onAdded();
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <QuantityControl quantity={qty} onChange={setQty} />
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading || added}
        style={{
          flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
          background: added ? '#dcfce7' : '#3b82f6',
          color: added ? '#15803d' : '#fff',
          fontWeight: 700, fontSize: 13, cursor: loading ? 'wait' : 'pointer',
          transition: 'all 200ms',
        }}
      >
        {added ? '✓ 추가됨' : loading ? '추가 중...' : '장바구니 담기'}
      </button>
    </div>
  );
}
