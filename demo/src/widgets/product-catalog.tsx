import { useEffect, useState } from 'react';
import type { Product } from '../shared/types';
import { fetchProducts } from '../shared/api/products-api';
import { ProductCard } from '../entities/product/product-card';
import { CategoryFilter } from '../features/category-filter';

type Props = { onSelectProduct: (id: string) => void };

export function ProductCatalog({ onSelectProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string>('All');

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 카테고리 필터 */}
      <CategoryFilter
        categories={categories}
        active={category}
        onChange={setCategory}
      />

      {/* 상품 그리드 */}
      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: 13 }}>불러오는 중...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} onClick={onSelectProduct} />
          ))}
        </div>
      )}
    </div>
  );
}
