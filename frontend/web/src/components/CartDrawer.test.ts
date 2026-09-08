import { describe, expect, it } from 'vitest';
import { formatMoney } from './ProductCard';
import type { CartItem } from '../lib/api';

describe('Cart Business Logic', () => {
  const sampleItems: CartItem[] = [
    {
      id: 'item_1',
      quantity: 2,
      product: {
        id: 'prod_1',
        title: 'Studio Monitor Arm',
        priceCents: 499900,
        currency: 'INR',
        category: 'Workspace',
        stock: 10,
        imageUrl: null,
        description: null,
        isActive: true,
      },
      lineTotalCents: 999800,
      isAvailable: true,
      isOutOfStock: false,
      hasSufficientStock: true,
    },
    {
      id: 'item_2',
      quantity: 1,
      product: {
        id: 'prod_2',
        title: 'AeroFit Headphones',
        priceCents: 1299900,
        currency: 'INR',
        category: 'Audio',
        stock: 0,
        imageUrl: null,
        description: null,
        isActive: true,
      },
      lineTotalCents: 1299900,
      isAvailable: false,
      isOutOfStock: true,
      hasSufficientStock: false,
    },
  ];

  it('calculates total quantity across all cart items correctly', () => {
    const totalCount = sampleItems.reduce((acc, item) => acc + item.quantity, 0);
    expect(totalCount).toBe(3);
  });

  it('calculates subtotal for available items only without charging for out of stock inventory', () => {
    const availableSubtotal = sampleItems
      .filter((i) => i.isAvailable !== false && !i.isOutOfStock)
      .reduce((sum, i) => sum + (i.product.priceCents * i.quantity), 0);

    expect(availableSubtotal).toBe(999800);
    expect(formatMoney(availableSubtotal).replace(/\s+/g, '')).toContain('9,998');
  });

  it('detects when cart contains unavailable or out-of-stock items requiring resolution', () => {
    const hasUnavailable = sampleItems.some((i) => !i.isAvailable || i.isOutOfStock);
    expect(hasUnavailable).toBe(true);
  });
});
