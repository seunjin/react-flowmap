import { useEffect, useState } from 'react';
import type { Product } from '../shared/types';
import { fetchProduct } from '../shared/api/products-api';
import { Spinner } from '../shared/ui/spinner';
import { Button } from '../shared/ui/button';
import { ProductBadge } from '../entities/product/product-badge';
import { ProductPrice } from '../entities/product/product-price';
import { ProductRating } from '../entities/product/product-rating';
import { AddToCart } from '../features/add-to-cart';

type Props = { productId: string; onBack: () => void; onCartUpdated: () => void };

export function ProductDetail({ productId, onBack, onCartUpdated }: Props) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    setProduct(null);
    fetchProduct(productId).then(setProduct);
  }, [productId]);

  if (!product) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← 목록으로
      </Button>

      <div style={{
        height: 180, borderRadius: 16, background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72,
      }}>
        {product.emoji}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
          {product.category}
        </span>
        {product.badge && <ProductBadge badge={product.badge} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{product.name}</h2>
        {product.rating && (
          <ProductRating score={product.rating.score} count={product.rating.count} />
        )}
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{product.description}</p>
      </div>

      <ProductPrice
        price={product.price}
        {...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {})}
        size="lg"
      />

      <AddToCart product={product} onAdded={onCartUpdated} />
    </div>
  );
}
