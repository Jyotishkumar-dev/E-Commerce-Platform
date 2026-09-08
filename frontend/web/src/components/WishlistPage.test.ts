import { describe, expect, it } from 'vitest';
import type { WishlistItem } from '../lib/api';

describe('Wishlist Business Logic', () => {
  const mockWishlist: WishlistItem[] = [
    {
      id: 'wl_1',
      productId: 'prod_1',
      product: {
        id: 'prod_1',
        title: 'Studio Monitor Arm',
        priceCents: 499900,
        compareAtPriceCents: 599900,
        currency: 'INR',
        category: 'Workspace',
        stock: 10,
        imageUrl: null,
        description: null,
        isActive: true,
      },
    },
    {
      id: 'wl_2',
      productId: 'prod_2',
      product: {
        id: 'prod_2',
        title: 'AeroFit Headphones',
        priceCents: 1299900,
        compareAtPriceCents: null,
        currency: 'INR',
        category: 'Audio',
        stock: 0,
        imageUrl: null,
        description: null,
        isActive: true,
      },
    },
  ];

  it('generates unique set of wishlisted product IDs for fast O(1) lookup', () => {
    const ids = new Set(mockWishlist.map((item) => item.product.id || item.productId));
    expect(ids.has('prod_1')).toBe(true);
    expect(ids.has('prod_2')).toBe(true);
    expect(ids.has('prod_3')).toBe(false);
  });

  it('correctly identifies discounted products and calculates discount percentage', () => {
    const item = mockWishlist[0];
    const hasDiscount = Boolean(item.product.compareAtPriceCents) &&
      (item.product.compareAtPriceCents ?? 0) > item.product.priceCents;

    const discountPercent = hasDiscount
      ? Math.round(
          (((item.product.compareAtPriceCents ?? 0) - item.product.priceCents) /
            (item.product.compareAtPriceCents ?? 1)) *
            100,
        )
      : 0;

    expect(hasDiscount).toBe(true);
    expect(discountPercent).toBe(17); // (599900 - 499900) / 599900 * 100 ~ 16.67 -> 17%
  });

  it('accurately distinguishes between in-stock and out-of-stock wishlist items', () => {
    expect(mockWishlist[0].product.stock > 0).toBe(true);
    expect(mockWishlist[1].product.stock <= 0).toBe(true);
  });
});
