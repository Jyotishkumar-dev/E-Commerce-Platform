import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';

export interface CreateOrderInput {
  shippingAddressId?: string;
  couponCode?: string;
  paymentMethod?: 'RAZORPAY' | 'COD';
}

export class OrderService {
  static async createOrder(userId: string, input?: CreateOrderInput) {
    const paymentMethod = input?.paymentMethod ?? 'RAZORPAY';
    const isOnlinePayment = paymentMethod === 'RAZORPAY';

    return prisma.$transaction(async (tx) => {
      // 1. Fetch active cart with authoritative product records
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestError('Your shopping bag is empty.');
      }

      // 2. Validate product availability and stock
      for (const item of cart.items) {
        if (!item.product.isActive) {
          throw new ConflictError(
            `Product "${item.product.title}" is no longer available. Please remove it from your bag.`,
          );
        }
        if (item.quantity > item.product.stock) {
          throw new ConflictError(
            `Insufficient stock for "${item.product.title}". Requested: ${item.quantity}, Available: ${item.product.stock}.`,
          );
        }
      }

      // 3. Authoritative server-side price calculation
      const subtotalCents = cart.items.reduce(
        (sum, item) => sum + item.product.priceCents * item.quantity,
        0,
      );

      let discountCents = 0;
      let couponId: string | undefined;

      // 4. Validate and apply coupon if provided
      if (input?.couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: input.couponCode.toUpperCase() },
        });

        const now = new Date();
        if (
          coupon &&
          coupon.isActive &&
          coupon.startsAt <= now &&
          (!coupon.expiresAt || coupon.expiresAt >= now) &&
          (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
          subtotalCents >= coupon.minimumOrderValueCents
        ) {
          couponId = coupon.id;
          if (coupon.type === 'PERCENTAGE') {
            discountCents = Math.round((subtotalCents * coupon.value) / 100);
            if (coupon.maximumDiscountCents) {
              discountCents = Math.min(discountCents, coupon.maximumDiscountCents);
            }
          } else {
            discountCents = Math.min(coupon.value, subtotalCents);
          }

          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // 5. Snapshot shipping address if provided
      let shippingAddressSnapshot: Record<string, unknown> | null = null;
      if (input?.shippingAddressId) {
        const address = await tx.address.findFirst({
          where: { id: input.shippingAddressId, userId },
        });
        if (address) {
          shippingAddressSnapshot = {
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          };
        }
      }

      const shippingFeeCents = 0; // Free standard shipping in India
      const taxCents = 0; // Inclusive taxes
      const totalCents = Math.max(0, subtotalCents - discountCents + shippingFeeCents + taxCents);

      // 6. Create Order record
      // For online payments, order starts as PENDING and moves to CONFIRMED after payment verification
      // For COD, order is CONFIRMED immediately
      const initialStatus = isOnlinePayment ? 'PENDING' : 'CONFIRMED';

      const order = await tx.order.create({
        data: {
          userId,
          status: initialStatus,
          subtotalCents,
          discountCents,
          shippingFeeCents,
          taxCents,
          totalCents,
          couponId,
          shippingAddressSnapshot: (shippingAddressSnapshot as unknown as Prisma.InputJsonObject) ?? undefined,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productTitle: item.product.title,
              productSkuSnapshot: item.product.sku,
              unitPriceCents: item.product.priceCents,
              quantity: item.quantity,
              subtotalCents: item.product.priceCents * item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 7. For online payments, DO NOT decrement inventory or clear cart yet
      // Inventory will be decremented and cart cleared after payment verification
      // For COD, process immediately
      if (!isOnlinePayment) {
        // 7a. Atomically decrement inventory
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // 7b. Clear user's cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      // 8. Create Payment record for online payments
      if (isOnlinePayment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'RAZORPAY',
            amountCents: totalCents,
            currency: 'INR',
            status: 'PENDING',
          },
        });
      }

      return order;
    });
  }

  static async confirmOrderAfterPayment(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError('Order not found.');
      }

      if (order.status !== 'PENDING') {
        throw new ConflictError('Order cannot be confirmed in its current state.');
      }

      // Decrement inventory
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.stock < item.quantity) {
          throw new ConflictError(
            `Insufficient stock for product ${item.productTitle}.`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear user's cart
      const cart = await tx.cart.findUnique({
        where: { userId: order.userId },
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      // Update order status to CONFIRMED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' },
        include: { items: true },
      });

      return updatedOrder;
    });
  }

  static async cancelOrder(orderId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true, user: { select: { id: true } } },
      });

      if (!order) {
        throw new NotFoundError('Order not found.');
      }

      if (order.userId !== userId) {
        throw new NotFoundError('Order not found.');
      }

      if (order.status === 'CANCELLED') {
        throw new ConflictError('Order is already cancelled.');
      }

      if (order.status === 'DELIVERED') {
        throw new ConflictError('Delivered orders cannot be cancelled.');
      }

      if (order.status === 'SHIPPED') {
        throw new ConflictError('Shipped orders cannot be cancelled. Please contact support.');
      }

      const isOnlinePayment = order.payment?.provider === 'RAZORPAY';

      if (isOnlinePayment && order.payment?.status === 'SUCCESS') {
        throw new ConflictError('Paid orders require a refund. Please use the refund option.');
      }

      if (isOnlinePayment && order.payment?.status === 'PENDING') {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'FAILED' },
        });
      }

      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      return { message: 'Order cancelled successfully' };
    });
  }

  static async getOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getOrderById(userId: string, orderId: string, role: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                imageUrl: true,
                category: true,
              },
            },
          },
        },
        payment: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    if (role !== 'ADMIN' && order.userId !== userId) {
      throw new NotFoundError('Order not found.');
    }

    return order;
  }
}
