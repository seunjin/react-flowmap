import { Route, Routes } from 'react-router-dom';
import { App } from './app';
import { HomePage } from './pages/home-page';
import { ProductPage } from './pages/product-page';
import { CartPage } from './pages/cart-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<HomePage />} />
        <Route path="product/:productId" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
      </Route>
    </Routes>
  );
}
