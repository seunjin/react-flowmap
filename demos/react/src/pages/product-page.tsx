import { useParams } from 'react-router-dom';
import { useAppContext } from '../app';
import { ProductDetail } from '../widgets/product-detail';

export function ProductPage() {
  const { productId } = useParams();
  const { onCartUpdated } = useAppContext();

  if (!productId) {
    return null;
  }

  return (
    <div>
      <ProductDetail productId={productId} onCartUpdated={onCartUpdated} />
    </div>
  );
}
