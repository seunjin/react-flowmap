import { ProductDetail } from '../widgets/product-detail';

type Props = { productId: string; onBack: () => void; onCartUpdated: () => void };

export function ProductPage({ productId, onBack, onCartUpdated }: Props) {
  return (
    <div>
      <ProductDetail productId={productId} onBack={onBack} onCartUpdated={onCartUpdated} />
    </div>
  );
}
