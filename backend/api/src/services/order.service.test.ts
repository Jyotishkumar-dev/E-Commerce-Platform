import { describe, expect, it, vi } from 'vitest';
import { OrderService } from './order.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    cart: {
      findUnique: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    product: {
      update: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    address: {
      findFirst: vi.fn(),
    },
  },
}));

describe('OrderService', () => {
  it('throws BadRequestError when user attempts to checkout with an empty cart', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [],
    } as any);

    await expect(OrderService.createOrder('usr_1')).rejects.toThrow(BadRequestError);
  });

  it('throws ConflictError when cart contains an item with insufficient stock', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          quantity: 5,
          product: {
            id: 'prod_1',
            title: 'Studio Keyboard',
            priceCents: 899900,
            stock: 2, // only 2 available
            isActive: true,
          },
        },
      ],
    } as any);

    await expect(OrderService.createOrder('usr_1')).rejects.toThrow(ConflictError);
  });

  it('atomically creates order, decrements stock, and clears cart', async () => {
    const mockCart = {
      id: 'cart_1',
      userId: 'usr_1',
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          quantity: 2,
          product: {
            id: 'prod_1',
            title: 'AeroFit Headphones',
            sku: 'AUD-AF-001',
            priceCents: 1299900,
            stock: 10,
            isActive: true,
          },
        },
      ],
    };

    const mockCreatedOrder = {
      id: 'ord_123',
      userId: 'usr_1',
      status: 'CONFIRMED',
      totalCents: 2599800,
      items: [
        {
          id: 'ord_item_1',
          productId: 'prod_1',
          productTitle: 'AeroFit Headphones',
          unitPriceCents: 1299900,
          quantity: 2,
        },
      ],
    };

    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
    vi.mocked(prisma.order.create).mockResolvedValueOnce(mockCreatedOrder as any);

    const order = await OrderService.createOrder('usr_1');

    expect(order.id).toBe('ord_123');
    expect(order.totalCents).toBe(2599800);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod_1' },
      data: { stock: { decrement: 2 } },
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart_1' },
    });
  });
});
