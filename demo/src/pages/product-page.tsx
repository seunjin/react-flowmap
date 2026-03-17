import { useParams } from '@tanstack/react-router';
import { useAppContext } from '../app';
import { ProductDetail } from '../widgets/product-detail';

export function ProductPage() {
  const { productId } = useParams({ from: '/product/$productId' });
  const { onCartUpdated } = useAppContext();

  return (
    <div>
      <ProductDetail productId={productId} onCartUpdated={onCartUpdated} />
    </div>
  );
}
