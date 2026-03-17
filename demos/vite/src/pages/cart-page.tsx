import { CartSummary } from '../widgets/cart-summary';

export function CartPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>장바구니</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>담은 상품을 확인하고 결제하세요</p>
      </div>
      <CartSummary />
    </div>
  );
}
