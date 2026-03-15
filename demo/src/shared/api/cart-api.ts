import type { CartItem } from '../types';

export async function fetchCart(): Promise<CartItem[]> {
  const res = await fetch('/api/cart');
  return res.json() as Promise<CartItem[]>;
}

export async function addToCart(productId: string, quantity: number): Promise<CartItem> {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  return res.json() as Promise<CartItem>;
}

export async function updateCartItem(id: string, quantity: number): Promise<void> {
  await fetch(`/api/cart/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(id: string): Promise<void> {
  await fetch(`/api/cart/${id}`, { method: 'DELETE' });
}
