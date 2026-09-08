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
  seller?: { name: string | null };
};

export type CartItem = {
  id: string;
  quantity: number;
  product: Product;
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
