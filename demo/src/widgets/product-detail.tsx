import { useEffect, useState } from 'react';
import type { Product } from '../shared/types';
import { fetchProduct } from '../shared/api/products-api';
import { ProductBadge } from '../entities/product/product-badge';
import { ProductPrice } from '../entities/product/product-price';
import { AddToCart } from '../features/add-to-cart';

type Props = { productId: string; onBack: () => void; onCartUpdated: () => void };

export function ProductDetail({ productId, onBack, onCartUpdated }: Props) {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    setProduct(null);
    fetchProduct(productId).then(setProduct);
  }, [productId]);

  if (!product) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: 13 }}>불러오는 중...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, padding: 0, width: 'fit-content' }}
      >
        ← 목록으로
      </button>

      {/* 상품 이미지 */}
      <div style={{
        height: 180, borderRadius: 16, background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72,
      }}>
        {product.emoji}
      </div>

      {/* 배지 + 카테고리 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
          {product.category}
        </span>
        {product.badge && <ProductBadge badge={product.badge} />}
      </div>

      {/* 상품명 + 설명 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{product.name}</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{product.description}</p>
      </div>

      {/* 가격 */}
      <ProductPrice price={product.price} {...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {})} size="lg" />

      {/* 장바구니 담기 */}
      <AddToCart product={product} onAdded={onCartUpdated} />
    </div>
  );
}
