import { useEffect, useState } from 'react';
import type { Product } from '../shared/types';
import { fetchProducts } from '../shared/api/products-api';
import { Spinner } from '../shared/ui/spinner';
import { EmptyState } from '../shared/ui/empty-state';
import { ProductCard } from '../entities/product/product-card';
import { CategoryFilter } from '../features/category-filter';

type Props = { onSelectProduct: (id: string) => void };

export function ProductCatalog({ onSelectProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('All');

  useEffect(() => {
    setLoading(true);
    fetchProducts().then(data => { setProducts(data); setLoading(false); });
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = category === 'All' ? products : products.filter(p => p.category === category);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CategoryFilter categories={categories} active={category} onChange={setCategory} />

      {filtered.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="검색 결과가 없습니다"
          description={`'${category}' 카테고리에 상품이 없습니다`}
        />
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
