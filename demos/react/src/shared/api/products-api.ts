import type { Product } from '../types';

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  return res.json() as Promise<Product[]>;
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  return res.json() as Promise<Product>;
}
