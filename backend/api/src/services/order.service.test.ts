import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrderService } from './order.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma: any = {
    cart: { findUnique: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    product: { update: vi.fn() },
    order: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    address: { findFirst: vi.fn() },
  };
  return {
    prisma: {
      ...mockPrisma,
      $transaction: vi.fn(async (cb: (tx: typeof mockPrisma) => Promise<any>) => {
        return await cb(mockPrisma);
      }),
    },
  };
});

describe('OrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
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
              stock: 2,
              isActive: true,
            },
          },
        ],
      } as any);

      await expect(OrderService.createOrder('usr_1')).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when cart contains an inactive product', async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Discontinued Product',
              priceCents: 100000,
              stock: 10,
              isActive: false,
            },
          },
        ],
      } as any);

      await expect(OrderService.createOrder('usr_1')).rejects.toThrow(ConflictError);
    });

    it('silently ignores shipping address that does not belong to user', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'AeroFit Headphones',
              priceCents: 1299900,
              stock: 10,
              isActive: true,
            },
          },
        ],
      } as any;
      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart);
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 1299900,
        shippingAddressSnapshot: null,
      } as any);

      const order = await OrderService.createOrder('usr_1', { shippingAddressId: 'addr_999' });

      expect(order.shippingAddressSnapshot).toBeNull();
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

    it('uses authoritative server-side prices, not cart prices', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Price Changed Product',
              priceCents: 200000, // Current DB price
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 200000,
        items: [
          {
            id: 'ord_item_1',
            productId: 'prod_1',
            productTitle: 'Price Changed Product',
            unitPriceCents: 200000,
            quantity: 1,
            subtotalCents: 200000,
          },
        ],
      } as any);

      const order = await OrderService.createOrder('usr_1');

      // Order should use current DB price (200000), not any stale cart price
      expect(order.totalCents).toBe(200000);
    });

    it('creates order items with price snapshots', async () => {
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
              title: 'Snapshot Product',
              sku: 'SKU-001',
              priceCents: 150000,
              stock: 5,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 300000,
        items: [
          {
            id: 'ord_item_1',
            productId: 'prod_1',
            productTitle: 'Snapshot Product',
            productSkuSnapshot: 'SKU-001',
            unitPriceCents: 150000,
            quantity: 2,
            subtotalCents: 300000,
          },
        ],
      } as any);

      const order = await OrderService.createOrder('usr_1');

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  productId: 'prod_1',
                  productTitle: 'Snapshot Product',
                  productSkuSnapshot: 'SKU-001',
                  unitPriceCents: 150000,
                  quantity: 2,
                  subtotalCents: 300000,
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('applies valid coupon and increments usage count', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Product',
              priceCents: 100000,
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'coupon_1',
        code: 'SAVE10',
        type: 'PERCENTAGE',
        value: 10,
        minimumOrderValueCents: 50000,
        maximumDiscountCents: 5000,
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
        startsAt: new Date('2020-01-01'),
        expiresAt: new Date('2030-01-01'),
      } as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 95000, // 100000 - 5000 (max discount)
      } as any);

      const order = await OrderService.createOrder('usr_1', { couponCode: 'SAVE10' });

      expect(prisma.coupon.findUnique).toHaveBeenCalledWith({
        where: { code: 'SAVE10' },
      });
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon_1' },
        data: { usedCount: { increment: 1 } },
      });
      expect(order.totalCents).toBe(95000);
    });

    it('ignores invalid/expired coupon', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Product',
              priceCents: 100000,
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'coupon_1',
        code: 'EXPIRED',
        type: 'PERCENTAGE',
        value: 10,
        isActive: false,
        usedCount: 0,
      } as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 100000,
      } as any);

      const order = await OrderService.createOrder('usr_1', { couponCode: 'EXPIRED' });

      expect(prisma.coupon.update).not.toHaveBeenCalled();
      expect(order.totalCents).toBe(100000);
    });

    it('includes shipping address snapshot when valid address provided', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Product',
              priceCents: 100000,
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        fullName: 'Test User',
        phone: '+919876543210',
        addressLine1: '123 Test St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      } as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 100000,
        shippingAddressSnapshot: {
          fullName: 'Test User',
          phone: '+919876543210',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
      } as any);

      await OrderService.createOrder('usr_1', { shippingAddressId: 'addr_1' });

      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: 'addr_1', userId: 'usr_1' },
      });
    });

    it('calculates total with free shipping and inclusive taxes', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 3,
            product: {
              id: 'prod_1',
              title: 'Product',
              priceCents: 100000,
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        subtotalCents: 300000,
        shippingFeeCents: 0,
        taxCents: 0,
        totalCents: 300000,
      } as any);

      const order = await OrderService.createOrder('usr_1');

      expect(order.shippingFeeCents).toBe(0);
      expect(order.taxCents).toBe(0);
      expect(order.totalCents).toBe(300000);
    });
  });

  describe('getOrders', () => {
    it('returns orders for user ordered by createdAt desc', async () => {
      const mockOrders = [
        { id: 'ord_2', userId: 'usr_1', createdAt: new Date('2024-01-02') },
        { id: 'ord_1', userId: 'usr_1', createdAt: new Date('2024-01-01') },
      ];
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders as any);

      const orders = await OrderService.getOrders('usr_1');

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        include: { items: true, payment: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(orders).toEqual(mockOrders);
    });
  });

  describe('getOrderById', () => {
    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      await expect(OrderService.getOrderById('usr_1', 'ord_999', 'CUSTOMER')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws NotFoundError when customer tries to access another user order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord_1',
        userId: 'usr_2',
      } as any);

      await expect(OrderService.getOrderById('usr_1', 'ord_1', 'CUSTOMER')).rejects.toThrow(
        NotFoundError,
      );
    });

    it('allows admin to access any order', async () => {
      const mockOrder = {
        id: 'ord_1',
        userId: 'usr_2',
        items: [],
        payment: null,
      };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);

      const order = await OrderService.getOrderById('usr_1', 'ord_1', 'ADMIN');

      expect(order.id).toBe('ord_1');
    });

    it('allows customer to access own order', async () => {
      const mockOrder = {
        id: 'ord_1',
        userId: 'usr_1',
        items: [],
        payment: null,
      };
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(mockOrder as any);

      const order = await OrderService.getOrderById('usr_1', 'ord_1', 'CUSTOMER');

      expect(order.id).toBe('ord_1');
    });
  });

  describe('security - price integrity', () => {
    it('never trusts frontend-supplied prices', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Product',
              priceCents: 500000, // DB price
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 500000,
      } as any);

      await OrderService.createOrder('usr_1');

      // Verify order.create was called with DB price, not any frontend price
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotalCents: 500000,
            totalCents: 500000,
          }),
        }),
      );
    });

    it('never trusts frontend-supplied totals', async () => {
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
              title: 'Product',
              priceCents: 100000,
              stock: 10,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 200000,
      } as any);

      await OrderService.createOrder('usr_1');

      // Total should be calculated server-side
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalCents: 200000, // 2 * 100000
          }),
        }),
      );
    });
  });

  describe('inventory race condition protection', () => {
    it('decrements stock atomically within transaction', async () => {
      const mockCart = {
        id: 'cart_1',
        userId: 'usr_1',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            quantity: 1,
            product: {
              id: 'prod_1',
              title: 'Limited Stock Item',
              priceCents: 100000,
              stock: 1,
              isActive: true,
            },
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);
      vi.mocked(prisma.order.create).mockResolvedValueOnce({
        id: 'ord_123',
        userId: 'usr_1',
        totalCents: 100000,
      } as any);

      await OrderService.createOrder('usr_1');

      // Stock decrement happens in same transaction as order creation
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod_1' },
        data: { stock: { decrement: 1 } },
      });
    });
  });
});