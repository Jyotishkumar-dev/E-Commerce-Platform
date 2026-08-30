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

    // Filter only active product items and compute totals dynamically
    const activeItems = cart.items.filter((item) => item.product.isActive);
    const subtotalCents = activeItems.reduce(
      (sum, item) => sum + item.product.priceCents * item.quantity,
      0,
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: activeItems,
      itemCount: activeItems.reduce((count, item) => count + item.quantity, 0),
      subtotalCents,
    };
  }

  static async addItem(userId: string, productId: string, quantity = 1) {
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

  static async updateItem(userId: string, productId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundError('Cart not found.');
    }

    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
      return this.getCart(userId);
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} units currently available.`);
    }

    await prisma.cartItem.update({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  static async removeItem(userId: string, productId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    }
    return this.getCart(userId);
  }
}
