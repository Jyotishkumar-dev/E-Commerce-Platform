import { prisma } from '../lib/prisma.js';
import { defaultProductSelect } from './product.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class CartService {
  static async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: defaultProductSelect },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: { select: defaultProductSelect },
            },
          },
        },
      });
    }

    const enrichedItems = cart.items.map((item) => {
      const isOutOfStock = item.product.stock <= 0;
      const isAvailable = Boolean(item.product.isActive) && !isOutOfStock;
      const hasSufficientStock = item.product.stock >= item.quantity;
      const lineTotalCents = item.product.priceCents * item.quantity;

      return {
        ...item,
        isAvailable,
        isOutOfStock,
        hasSufficientStock,
        maxAvailable: Math.max(0, item.product.stock),
        lineTotalCents,
      };
    });

    // Only active and in-stock items contribute to the authoritative subtotal
    const eligibleItems = enrichedItems.filter((item) => item.isAvailable);
    const subtotalCents = eligibleItems.reduce(
      (sum, item) => sum + item.lineTotalCents,
      0,
    );

    const hasUnavailableItems = enrichedItems.some(
      (item) => !item.isAvailable || !item.hasSufficientStock,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((count, item) => count + item.quantity, 0),
      subtotalCents,
      hasUnavailableItems,
    };
  }

  static async addItem(userId: string, productId: string, quantity = 1) {
    if (quantity < 1 || quantity > 20) {
      throw new BadRequestError('Quantity must be between 1 and 20.');
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found or unavailable.');
    }

    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} units currently in stock.`);
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (newQuantity > product.stock) {
      throw new BadRequestError(
        `Cannot add ${quantity} more. You already have ${existingItem?.quantity} in your bag and only ${product.stock} are available.`,
      );
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
      update: { quantity: newQuantity },
      create: {
        cartId: cart.id,
        productId: product.id,
        quantity,
      },
    });

    return this.getCart(userId);
  }

  static async updateItem(userId: string, productIdOrItemId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundError('Cart not found.');
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ productId: productIdOrItemId }, { id: productIdOrItemId }],
      },
      include: { product: true },
    });

    if (!existingItem) {
      throw new NotFoundError('Cart item not found in your bag.');
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
      return this.getCart(userId);
    }

    if (quantity > 20) {
      throw new BadRequestError('Maximum 20 units per item.');
    }

    if (!existingItem.product.isActive) {
      throw new BadRequestError('This product is no longer available.');
    }

    if (existingItem.product.stock < quantity) {
      throw new BadRequestError(`Only ${existingItem.product.stock} units currently available.`);
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  static async removeItem(userId: string, productIdOrItemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          OR: [{ productId: productIdOrItemId }, { id: productIdOrItemId }],
        },
      });
    }
    return this.getCart(userId);
  }

  static async moveToWishlist(userId: string, productIdOrItemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundError('Cart not found.');
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ productId: productIdOrItemId }, { id: productIdOrItemId }],
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item not found in your bag.');
    }

    const productId = cartItem.productId;

    // Atomically create wishlist item and remove cart item (Step 18 & Step 36)
    await prisma.$transaction(async (tx) => {
      await tx.wishlistItem.upsert({
        where: {
          userId_productId: { userId, productId },
        },
        update: {},
        create: { userId, productId },
      });

      await tx.cartItem.delete({
        where: { id: cartItem.id },
      });
    });

    return this.getCart(userId);
  }

  static async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }
    return this.getCart(userId);
  }
}

