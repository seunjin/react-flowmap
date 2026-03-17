import type { Product } from '../../shared/types';
import { ProductBadge } from './product-badge';
import { ProductPrice } from './product-price';

type Props = { product: Product; onClick: (id: string) => void };

export function ProductCard({ product, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick(product.id)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 14, borderRadius: 12, border: '1px solid #e2e8f0',
        background: '#fff', cursor: 'pointer', textAlign: 'left',
        transition: 'box-shadow 150ms, transform 150ms',
        width: '100%',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
    >
      {/* 상품 이미지 (이모지) */}
      <div style={{
        height: 80, borderRadius: 8, background: '#f8fafc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36,
      }}>
        {product.emoji}
      </div>

      {/* 배지 + 카테고리 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{product.category}</span>
        {product.badge && <ProductBadge badge={product.badge} />}
      </div>

      {/* 상품명 */}
      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
        {product.name}
      </span>

      {/* 가격 */}
      <ProductPrice price={product.price} {...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {})} size="sm" />
    </button>
  );
}
