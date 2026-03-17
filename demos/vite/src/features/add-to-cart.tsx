import { useState } from 'react';
import type { Product } from '../shared/types';
import { addToCart } from '../shared/api/cart-api';
import { Button } from '../shared/ui/button';
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
      {added ? (
        <Button variant="secondary" size="lg" fullWidth disabled>
          ✓ 추가됨
        </Button>
      ) : (
        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleAdd}>
          장바구니 담기
        </Button>
      )}
    </div>
  );
}
