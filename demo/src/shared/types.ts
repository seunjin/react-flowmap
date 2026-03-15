export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  badge?: 'sale' | 'new' | 'hot';
  description: string;
  emoji: string;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  emoji: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};
