import { prisma } from '../lib/prisma.js';
import { defaultProductSelect } from './product.service.js';
import { NotFoundError } from '../utils/errors.js';

export class WishlistService {
  static async getWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: { select: defaultProductSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  static async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {},
      create: { userId, productId },
    });

    return { message: 'Item saved to wishlist' };
  }

  static async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });

    return { message: 'Item removed from wishlist' };
  }
}
