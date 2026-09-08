import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

export type Product = {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  priceCents: number;
  compareAtPriceCents?: number | null;
  currency: string;
  category: string;
  brand?: string | null;
  sku?: string | null;
  imageUrl: string | null;
  stock: number;
  isActive?: boolean;
  seller?: { name: string | null };
};

export type CartItem = {
  id: string;
  cartId?: string;
  productId?: string;
  quantity: number;
  product: Product;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
  hasSufficientStock?: boolean;
  maxAvailable?: number;
  lineTotalCents?: number;
};

export type Cart = {
  id?: string;
  userId?: string;
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  hasUnavailableItems?: boolean;
};

export type WishlistItem = {
  id: string;
  userId?: string;
  productId: string;
  product: Product;
  createdAt?: string;
};


export type Order = {
  id: string;
  status: string;
  subtotalCents?: number;
  discountCents?: number;
  totalCents: number;
  createdAt: string;
  items: {
    id: string;
    productTitle: string;
    unitPriceCents: number;
    quantity: number;
  }[];
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
};

export function setAccessToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function messageOf(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
