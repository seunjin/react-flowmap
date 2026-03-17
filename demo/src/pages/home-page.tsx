import { ProductCatalog } from '../widgets/product-catalog';

type Props = { onSelectProduct: (id: string) => void };

export function HomePage({ onSelectProduct }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 히어로 배너 */}
      <div style={{
        padding: '24px 20px', borderRadius: 16,
        background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
        border: '1px solid #e0e7ff',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 6, letterSpacing: '0.05em' }}>FLOWMAP SHOP</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>오늘의 추천 상품</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>다양한 카테고리의 상품을 둘러보세요</p>
      </div>

      {/* 상품 목록 */}
      <ProductCatalog onSelectProduct={onSelectProduct} />
    </div>
  );
}
