import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CartService } from './cart.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
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
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    wishlistItem: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('CartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('throws BadRequestError if existing cart quantity + requested quantity exceeds stock', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce({
      id: 'prod_1',
      title: 'AeroFit Headphones',
      stock: 5,
      isActive: true,
    } as any);
    vi.mocked(prisma.cart.upsert).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce({
      id: 'item_1',
      cartId: 'cart_1',
      productId: 'prod_1',
      quantity: 3,
    } as any);

    // Current has 3, wants 3 more = 6 > stock 5
    await expect(CartService.addItem('usr_1', 'prod_1', 3)).rejects.toThrow(BadRequestError);
  });

  it('increments quantity when duplicate product is added to cart within stock limits', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce({
      id: 'prod_1',
      title: 'AeroFit Headphones',
      stock: 10,
      isActive: true,
      priceCents: 1299900,
    } as any);
    vi.mocked(prisma.cart.upsert).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.findUnique).mockResolvedValueOnce({
      id: 'item_1',
      cartId: 'cart_1',
      productId: 'prod_1',
      quantity: 2,
    } as any);
    vi.mocked(prisma.cartItem.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [
        {
          id: 'item_1',
          quantity: 3,
          product: { id: 'prod_1', title: 'AeroFit Headphones', priceCents: 1299900, stock: 10, isActive: true },
        },
      ],
    } as any);

    const result = await CartService.addItem('usr_1', 'prod_1', 1);
    expect(prisma.cartItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { quantity: 3 },
      }),
    );
    expect(result.itemCount).toBe(3);
  });

  it('calculates cart subtotal dynamically from database prices and flags out-of-stock items', async () => {
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
            stock: 5,
            isActive: true,
          },
        },
        {
          id: 'item_2',
          quantity: 1,
          product: {
            id: 'prod_2',
            title: 'Studio Monitor Arm',
            priceCents: 499900,
            stock: 0, // out of stock
            isActive: true,
          },
        },
      ],
    };

    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart as any);

    const result = await CartService.getCart('usr_1');
    // Only in-stock item_1 contributes to subtotal: 2 * 1299900 = 2599800
    expect(result.subtotalCents).toBe(2599800);
    expect(result.itemCount).toBe(3);
    expect(result.items[1].isOutOfStock).toBe(true);
    expect(result.items[1].isAvailable).toBe(false);
    expect(result.hasUnavailableItems).toBe(true);
  });

  it('updates item quantity and deletes item when quantity is reduced to 0', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce({
      id: 'item_1',
      cartId: 'cart_1',
      productId: 'prod_1',
      quantity: 1,
      product: { id: 'prod_1', stock: 10, isActive: true },
    } as any);
    vi.mocked(prisma.cartItem.delete).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [],
    } as any);

    const result = await CartService.updateItem('usr_1', 'prod_1', 0);
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item_1' } });
    expect(result.items.length).toBe(0);
  });

  it('rejects quantity update exceeding available stock', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce({
      id: 'item_1',
      cartId: 'cart_1',
      productId: 'prod_1',
      quantity: 1,
      product: { id: 'prod_1', stock: 3, isActive: true },
    } as any);

    await expect(CartService.updateItem('usr_1', 'prod_1', 5)).rejects.toThrow(BadRequestError);
  });

  it('removes item from user cart', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [],
    } as any);

    const result = await CartService.removeItem('usr_1', 'prod_1');
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: {
        cartId: 'cart_1',
        OR: [{ productId: 'prod_1' }, { id: 'prod_1' }],
      },
    });
    expect(result.items.length).toBe(0);
  });

  it('atomically moves cart item to wishlist using Prisma transaction', async () => {
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ id: 'cart_1', userId: 'usr_1' } as any);
    vi.mocked(prisma.cartItem.findFirst).mockResolvedValueOnce({
      id: 'item_1',
      cartId: 'cart_1',
      productId: 'prod_1',
    } as any);
    vi.mocked(prisma.wishlistItem.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.cartItem.delete).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.cart.findUnique).mockResolvedValueOnce({
      id: 'cart_1',
      userId: 'usr_1',
      items: [],
    } as any);

    await CartService.moveToWishlist('usr_1', 'prod_1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith({
      where: { userId_productId: { userId: 'usr_1', productId: 'prod_1' } },
      update: {},
      create: { userId: 'usr_1', productId: 'prod_1' },
    });
    expect(prisma.cartItem.delete).toHaveBeenCalledWith({
      where: { id: 'item_1' },
    });
  });
});

