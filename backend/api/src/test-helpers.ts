export function createTestProduct(overrides: Partial<{
  id: string;
  title: string;
  priceCents: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  slug: string;
}> = {}) {
  return {
    id: 'prod_' + Math.random().toString(36).slice(2, 8),
    title: 'Test Product',
    priceCents: 12999,
    stock: 10,
    category: 'Audio',
    imageUrl: null,
    description: null,
    isActive: true,
    slug: 'test-product',
    ...overrides,
  };
}

export function createTestUser(overrides: Partial<{
  id: string;
  email: string;
  name: string;
  role: string;
}> = {}) {
  return {
    id: 'usr_' + Math.random().toString(36).slice(2, 8),
    email: 'test@shopvibe.store',
    name: 'Test User',
    role: 'CUSTOMER',
    ...overrides,
  };
}

export function createTestCart(overrides: Partial<{
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; unitPriceCents: number; subtotalCents: number }>;
  subtotalCents: number;
  itemCount: number;
}> = {}) {
  return {
    id: 'cart_' + Math.random().toString(36).slice(2, 8),
    userId: 'usr_1',
    items: [],
    subtotalCents: 0,
    itemCount: 0,
    ...overrides,
  };
}

export function createTestOrder(overrides: Partial<{
  id: string;
  userId: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  items: Array<{ productId: string; productTitle: string; quantity: number; unitPriceCents: number; subtotalCents: number }>;
}> = {}) {
  return {
    id: 'ord_' + Math.random().toString(36).slice(2, 8),
    userId: 'usr_1',
    status: 'PENDING',
    totalCents: 150000,
    subtotalCents: 150000,
    items: [],
    ...overrides,
  };
}

export function createTestReview(overrides: Partial<{
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  status: string;
}> = {}) {
  return {
    id: 'rev_' + Math.random().toString(36).slice(2, 8),
    productId: 'prod_1',
    userId: 'usr_1',
    rating: 5,
    title: 'Great product',
    body: 'This is a great product, highly recommend!',
    isVerifiedPurchase: true,
    status: 'PUBLISHED',
    ...overrides,
  };
}
