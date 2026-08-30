import type { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.js';

export class AdminService {
  static async getOverviewMetrics() {
    const [users, products, orders, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { totalCents: true },
      }),
    ]);

    return {
      users,
      products,
      orders,
      revenueCents: revenue._sum.totalCents ?? 0,
    };
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus) {
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new NotFoundError('Order not found.');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });
  }

  static async getAllOrders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, orders] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
