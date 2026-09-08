import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WishlistService } from './wishlist.service.js';
import { CartService } from './cart.service.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    product: {
      findFirst: vi.fn(),
    },
    wishlistItem: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('./cart.service.js', () => ({
  CartService: {
    addItem: vi.fn(),
  },
}));

describe('WishlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NotFoundError if product does not exist or is inactive when adding to wishlist', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

    await expect(WishlistService.addToWishlist('usr_1', 'nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('adds product to wishlist using upsert to prevent duplicates', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce({
      id: 'prod_1',
      title: 'AeroFit Headphones',
      isActive: true,
    } as any);
    vi.mocked(prisma.wishlistItem.upsert).mockResolvedValueOnce({} as any);

    const result = await WishlistService.addToWishlist('usr_1', 'prod_1');

    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith({
      where: { userId_productId: { userId: 'usr_1', productId: 'prod_1' } },
      update: {},
      create: { userId: 'usr_1', productId: 'prod_1' },
    });
    expect(result.message).toBe('Item saved to wishlist');
  });

  it('removes product from user wishlist', async () => {
    vi.mocked(prisma.wishlistItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);

    const result = await WishlistService.removeFromWishlist('usr_1', 'prod_1');

    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr_1', productId: 'prod_1' },
    });
    expect(result.message).toBe('Item removed from wishlist');
  });

  it('fetches wishlist items ordered by newest first', async () => {
    const mockItems = [
      {
        id: 'wl_1',
        userId: 'usr_1',
        productId: 'prod_1',
        product: { id: 'prod_1', title: 'Studio Monitor Arm', priceCents: 499900 },
      },
    ];
    vi.mocked(prisma.wishlistItem.findMany).mockResolvedValueOnce(mockItems as any);

    const items = await WishlistService.getWishlist('usr_1');

    expect(items).toEqual(mockItems);
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'usr_1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('moves item from wishlist to cart by adding to cart and removing from wishlist', async () => {
    vi.mocked(CartService.addItem).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.wishlistItem.deleteMany).mockResolvedValueOnce({ count: 1 } as any);

    const result = await WishlistService.moveToCart('usr_1', 'prod_1');

    expect(CartService.addItem).toHaveBeenCalledWith('usr_1', 'prod_1', 1);
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'usr_1', productId: 'prod_1' },
    });
    expect(result.message).toBe('Item moved to bag');
  });
});
