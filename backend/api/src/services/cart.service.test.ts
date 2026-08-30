import { describe, expect, it, vi } from 'vitest';
import { CartService } from './cart.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
    },
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    cartItem: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('CartService', () => {
  it('throws NotFoundError if product does not exist when adding to cart', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

    await expect(CartService.addItem('usr_1', 'invalid_prod', 1)).rejects.toThrow(NotFoundError);
  });

  it('throws BadRequestError if quantity exceeds product stock', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce({
      id: 'prod_1',
      title: 'AeroFit Headphones',
      stock: 2,
      isActive: true,
    } as any);

    await expect(CartService.addItem('usr_1', 'prod_1', 5)).rejects.toThrow(BadRequestError);
  });

  it('calculates cart subtotal dynamically from database prices', async () => {
    const mockCart = {
      id: 'cart_1',
      userId: 'usr_1',
      items: [
        {
          id: 'item_1',
          quantity: 2,
          product: {
            id: 'prod_1',
            title: 'AeroFit Headphones',
            priceCents: 1299900,
            isActive: true,
          },
        },
      ],
    };

    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);

    const result = await CartService.getCart('usr_1');
    expect(result.subtotalCents).toBe(2599800); // 2 * 1299900
    expect(result.itemCount).toBe(2);
  });
});
