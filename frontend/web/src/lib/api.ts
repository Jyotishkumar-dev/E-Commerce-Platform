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
  shippingFeeCents?: number;
  taxCents?: number;
  totalCents: number;
  createdAt: string;
  shippingAddressSnapshot?: Address | null;
  payment?: {
    id: string;
    provider: string;
    providerOrderId?: string | null;
    providerPaymentId?: string | null;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  user?: { id: string; email: string; name: string | null };
  items: {
    id: string;
    productTitle: string;
    productSkuSnapshot?: string | null;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
    product?: {
      id: string;
      slug: string;
      imageUrl: string | null;
      category: string;
    };
  }[];
};

export type Address = {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minimumOrderValueCents: number;
  maximumDiscountCents: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
