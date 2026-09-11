import type { OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';

export interface AdminDashboardMetrics {
  users: number;
  products: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  orders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  revenueCents: number;
  revenuePaidCents: number;
  averageOrderValueCents: number;
  recentOrders: Array<{
    id: string;
    createdAt: Date;
    status: OrderStatus;
    totalCents: number;
    user: { id: string; email: string; name: string | null };
  }>;
  lowStockItems: Array<{
    id: string;
    title: string;
    sku: string | null;
    stock: number;
    category: string;
  }>;
}

export interface AdminOrderFilters {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentProvider?: PaymentProvider;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AdminProductFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminCustomerFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminCouponFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

const LOW_STOCK_THRESHOLD = 10;

export class AdminService {
  static async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const [
      users,
      activeProducts,
      inactiveProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAgg,
      paidRevenueAgg,
      recentOrders,
      lowStockItems,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.product.count({ where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
      prisma.product.count({ where: { isActive: true, stock: { lte: 0 } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.aggregate({ _sum: { totalCents: true } }),
      prisma.order.aggregate({
        where: { payment: { status: 'SUCCESS' } },
        _sum: { totalCents: true },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, title: true, sku: true, stock: true, category: true },
        take: 10,
        orderBy: { stock: 'asc' },
      }),
    ]);

    const revenueCents = revenueAgg._sum.totalCents ?? 0;
    const revenuePaidCents = paidRevenueAgg._sum.totalCents ?? 0;
    const averageOrderValueCents = totalOrders > 0 ? Math.round(revenuePaidCents / totalOrders) : 0;

    return {
      users,
      products: activeProducts + inactiveProducts,
      activeProducts,
      inactiveProducts,
      lowStockProducts,
      outOfStockProducts,
      orders: totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueCents,
      revenuePaidCents,
      averageOrderValueCents,
      recentOrders,
      lowStockItems,
    };
  }

  static async getAllOrders(filters: AdminOrderFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.payment = { status: filters.paymentStatus };
    }

    if (filters.paymentProvider) {
      where.payment = { ...(where.payment as object), provider: filters.paymentProvider };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.dateTo);
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: { select: { id: true, productTitle: true, quantity: true, unitPriceCents: true, subtotalCents: true } },
          payment: true,
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

  static async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, slug: true, imageUrl: true, category: true } },
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    return order;
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      throw new NotFoundError('Order not found.');
    }

    if (existing.status !== status) {
      const allowed = validTransitions[existing.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BadRequestError(
          `Invalid status transition from ${existing.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`
        );
      }
    }

    // Handle inventory for CANCELLED orders
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { status } });
        
        // Restore inventory if order was confirmed/processing/shipped
        if (['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(existing.status)) {
          const orderWithItems = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
          });
          if (orderWithItems) {
            for (const item of orderWithItems.items) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        }

        // Update payment if exists
        const payment = await tx.payment.findUnique({ where: { orderId } });
        if (payment && payment.status === 'SUCCESS') {
          await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
        }
      });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { status } });
    }

    return this.getOrderById(orderId);
  }

  static async getAllProducts(filters: AdminProductFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.lowStock) {
      where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          categoryRef: { select: { id: true, name: true, slug: true } },
          images: { select: { id: true, url: true, altText: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async getAllCategories() {
    return prisma.category.findMany({
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async updateCategory(categoryId: string, input: { name?: string; slug?: string; description?: string; imageUrl?: string; isActive?: boolean }) {
    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing) {
      throw new NotFoundError('Category not found.');
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug: input.slug } });
      if (slugExists) {
        throw new ConflictError('A category with that slug already exists.');
      }
    }

    return prisma.category.update({
      where: { id: categoryId },
      data: input,
    });
  }

  static async deleteCategory(categoryId: string) {
    const existing = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!existing) {
      throw new NotFoundError('Category not found.');
    }

    const productCount = await prisma.product.count({ where: { categoryId } });
    if (productCount > 0) {
      throw new ConflictError(`Cannot delete category with ${productCount} associated products. Deactivate or reassign them first.`);
    }

    return prisma.category.delete({ where: { id: categoryId } });
  }

  static async getAllCustomers(filters: AdminCustomerFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { role: 'CUSTOMER' };

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { orders: true, addresses: true, wishlist: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Get order stats for each customer
    const customerIds = customers.map((c) => c.id);
    const orderStats = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: customerIds } },
      _sum: { totalCents: true },
      _count: true,
    });

    const statsMap = new Map(orderStats.map((s) => [s.userId, { totalSpent: s._sum.totalCents ?? 0, orderCount: s._count }]));

    const customersWithStats = customers.map((c) => ({
      ...c,
      totalSpent: statsMap.get(c.id)?.totalSpent ?? 0,
      orderCount: statsMap.get(c.id)?.orderCount ?? 0,
    }));

    return {
      customers: customersWithStats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async getAllCoupons(filters: AdminCouponFilters = {}) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [total, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      coupons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async createCoupon(input: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minimumOrderValueCents?: number;
    maximumDiscountCents?: number;
    usageLimit?: number;
    startsAt?: string;
    expiresAt?: string;
    description?: string;
  }) {
    const code = input.code.toUpperCase().trim();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError('A coupon with this code already exists.');
    }

    if (input.type === 'PERCENTAGE' && (input.value <= 0 || input.value > 100)) {
      throw new BadRequestError('Percentage value must be between 1 and 100.');
    }
    if (input.type === 'FIXED' && input.value <= 0) {
      throw new BadRequestError('Fixed discount value must be greater than zero.');
    }

    return prisma.coupon.create({
      data: {
        code,
        type: input.type,
        value: input.value,
        minimumOrderValueCents: input.minimumOrderValueCents ?? 0,
        maximumDiscountCents: input.maximumDiscountCents,
        usageLimit: input.usageLimit,
        startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        description: input.description,
      },
    });
  }

  static async updateCoupon(couponId: string, input: {
    code?: string;
    type?: 'PERCENTAGE' | 'FIXED';
    value?: number;
    minimumOrderValueCents?: number;
    maximumDiscountCents?: number;
    usageLimit?: number;
    startsAt?: string;
    expiresAt?: string;
    description?: string;
    isActive?: boolean;
  }) {
    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) {
      throw new NotFoundError('Coupon not found.');
    }

    if (input.code && input.code.toUpperCase().trim() !== existing.code) {
      const codeExists = await prisma.coupon.findUnique({ where: { code: input.code.toUpperCase().trim() } });
      if (codeExists) {
        throw new ConflictError('A coupon with this code already exists.');
      }
    }

    if (input.type === 'PERCENTAGE' && input.value !== undefined && (input.value <= 0 || input.value > 100)) {
      throw new BadRequestError('Percentage value must be between 1 and 100.');
    }
    if (input.type === 'FIXED' && input.value !== undefined && input.value <= 0) {
      throw new BadRequestError('Fixed discount value must be greater than zero.');
    }

    return prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...input,
        code: input.code?.toUpperCase().trim(),
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
    });
  }

  static async toggleCouponActive(couponId: string, isActive: boolean) {
    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) {
      throw new NotFoundError('Coupon not found.');
    }

    return prisma.coupon.update({
      where: { id: couponId },
      data: { isActive },
    });
  }
}