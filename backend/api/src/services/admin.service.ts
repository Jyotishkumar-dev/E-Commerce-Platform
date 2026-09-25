import type { OrderStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors.js';
import { uploadImage, deleteImage, deleteImagesByPrefix } from './cloudinary.service.js';

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
const MAX_IMAGES_PER_PRODUCT = 5;

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
      prisma.product.count({
        where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
      }),
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
      if (filters.dateFrom)
        (where.createdAt as Record<string, Date>).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as Record<string, Date>).lte = new Date(filters.dateTo);
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          items: {
            select: {
              id: true,
              productTitle: true,
              quantity: true,
              unitPriceCents: true,
              subtotalCents: true,
            },
          },
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
          `Invalid status transition from ${existing.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
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
          images: {
            select: { id: true, url: true, altText: true, sortOrder: true },
            orderBy: { sortOrder: 'asc' },
          },
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

  static async updateCategory(
    categoryId: string,
    input: {
      name?: string;
      slug?: string;
      description?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
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
      throw new ConflictError(
        `Cannot delete category with ${productCount} associated products. Deactivate or reassign them first.`,
      );
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

    const statsMap = new Map(
      orderStats.map((s) => [
        s.userId,
        { totalSpent: s._sum.totalCents ?? 0, orderCount: s._count },
      ]),
    );

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
      },
    });
  }

  static async updateCoupon(
    couponId: string,
    input: {
      code?: string;
      type?: 'PERCENTAGE' | 'FIXED';
      value?: number;
      minimumOrderValueCents?: number;
      maximumDiscountCents?: number;
      usageLimit?: number;
      startsAt?: string;
      expiresAt?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) {
      throw new NotFoundError('Coupon not found.');
    }

    if (input.code && input.code.toUpperCase().trim() !== existing.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: input.code.toUpperCase().trim() },
      });
      if (codeExists) {
        throw new ConflictError('A coupon with this code already exists.');
      }
    }

    if (
      input.type === 'PERCENTAGE' &&
      input.value !== undefined &&
      (input.value <= 0 || input.value > 100)
    ) {
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

  static async createProduct(input: {
    title: string;
    slug?: string;
    description?: string;
    priceCents: number;
    compareAtPriceCents?: number;
    category?: string;
    categoryId?: string;
    sku?: string;
    brand?: string;
    imageUrl?: string;
    stock: number;
    sellerId: string;
  }) {
    if (input.sku) {
      const existing = await prisma.product.findUnique({ where: { sku: input.sku.toUpperCase() } });
      if (existing) {
        throw new ConflictError('A product with this SKU already exists.');
      }
    }

    const slug =
      input.slug ||
      input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    return prisma.product.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents,
        category: input.category ?? 'General',
        categoryId: input.categoryId,
        sku: input.sku ? input.sku.toUpperCase() : undefined,
        brand: input.brand,
        imageUrl: input.imageUrl,
        stock: input.stock,
        sellerId: input.sellerId,
      },
    });
  }

  static async updateProduct(
    productId: string,
    input: {
      title?: string;
      slug?: string;
      description?: string;
      priceCents?: number;
      compareAtPriceCents?: number;
      category?: string;
      categoryId?: string | null;
      sku?: string;
      brand?: string;
      imageUrl?: string | null;
      stock?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }

    if (input.sku && input.sku.toUpperCase() !== existing.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: input.sku.toUpperCase() },
      });
      if (skuExists) {
        throw new ConflictError('A product with this SKU already exists.');
      }
    }

    if (input.priceCents !== undefined && input.priceCents < 0) {
      throw new BadRequestError('Price must be greater than or equal to zero.');
    }

    if (input.stock !== undefined && input.stock < 0) {
      throw new BadRequestError('Stock must be greater than or equal to zero.');
    }

    return prisma.product.update({
      where: { id: productId },
      data: {
        ...input,
        sku: input.sku ? input.sku.toUpperCase() : undefined,
      },
    });
  }

  static async updateProductStock(productId: string, stock: number) {
    if (stock < 0) {
      throw new BadRequestError('Stock must be greater than or equal to zero.');
    }

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }

    return prisma.product.update({
      where: { id: productId },
      data: { stock },
    });
  }

  static async getAnalytics(
    filters: {
      dateFrom?: string;
      dateTo?: string;
      period?: string;
    } = {},
  ) {
    let dateWhere: Record<string, Date> = {};
    const now = new Date();

    if (filters.period) {
      const periodMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = periodMap[filters.period];
      if (days) {
        dateWhere = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
      }
    } else if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) dateWhere.gte = new Date(filters.dateFrom);
      if (filters.dateTo) dateWhere.lte = new Date(filters.dateTo);
    }

    const where = dateWhere.gte || dateWhere.lte ? { createdAt: dateWhere } : {};

    const [revenueData, orderStatusData, topProducts, totalOrders, totalRevenue] =
      await Promise.all([
        prisma.order.groupBy({
          by: ['createdAt'],
          where: { ...where, payment: { status: 'SUCCESS' } },
          _sum: { totalCents: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
        }),
        prisma.orderItem.groupBy({
          by: ['productId', 'productTitle'],
          where: { order: where },
          _sum: { quantity: true, subtotalCents: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        }),
        prisma.order.count({ where }),
        prisma.order.aggregate({ where, _sum: { totalCents: true } }),
      ]);

    const revenueTrend = revenueData.map((r) => ({
      date: r.createdAt.toISOString().split('T')[0],
      revenueCents: r._sum.totalCents ?? 0,
    }));

    const statusDistribution = orderStatusData.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const topProductsData = topProducts.map((p) => ({
      productTitle: p.productTitle,
      unitsSold: p._sum.quantity ?? 0,
      revenueCents: p._sum.subtotalCents ?? 0,
    }));

    return {
      revenueTrend,
      statusDistribution,
      topProducts: topProductsData,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalCents ?? 0,
      averageOrderValue:
        totalOrders > 0 ? Math.round((totalRevenue._sum.totalCents ?? 0) / totalOrders) : 0,
    };
  }

  static async validateCoupon(input: { code: string; minimumOrderValueCents?: number }) {
    const code = input.code.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      throw new NotFoundError('Coupon not found.');
    }
    if (!coupon.isActive) {
      throw new BadRequestError('Coupon is not active.');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestError('Coupon has expired.');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached.');
    }
    if (
      input.minimumOrderValueCents !== undefined &&
      input.minimumOrderValueCents < coupon.minimumOrderValueCents
    ) {
      throw new BadRequestError(
        `Minimum order value of ${coupon.minimumOrderValueCents} cents required.`,
      );
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minimumOrderValueCents: coupon.minimumOrderValueCents,
        maximumDiscountCents: coupon.maximumDiscountCents,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        isActive: coupon.isActive,
      },
    };
  }

  static async getInventory() {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        sku: true,
        stock: true,
        category: true,
        categoryRef: { select: { id: true, name: true } },
        isActive: true,
      },
      orderBy: { stock: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      lowStock: p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD,
      outOfStock: p.stock <= 0,
    }));
  }

  // ==========================================
  // Product Media Management
  // ==========================================

  static async getProductImages(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    return images;
  }

  static async uploadProductImage(
    productId: string,
    fileBuffer: Buffer,
    options?: { altText?: string; isPrimary?: boolean },
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, images: { select: { id: true } } },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    if (product.images.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestError(`Maximum ${MAX_IMAGES_PER_PRODUCT} images allowed per product.`);
    }

    // Upload to Cloudinary
    const cloudinaryResult = await uploadImage(fileBuffer, productId);

    // Determine sort order (append to end)
    const maxSortOrder = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });

    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // If this is set as primary, unset any existing primary
    if (options?.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Create database record
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
        altText: options?.altText ?? null,
        sortOrder,
        isPrimary: options?.isPrimary ?? false,
      },
    });

    return image;
  }

  static async setPrimaryImage(productId: string, imageId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundError('Image not found for this product.');
    }

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // Unset all primary images for this product
      await tx.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });

      // Set the new primary
      const updated = await tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });

      return updated;
    });
  }

  static async reorderImages(productId: string, imageIds: string[]) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found.');
    }

    // Verify all images belong to this product
    const images = await prisma.productImage.findMany({
      where: { id: { in: imageIds }, productId },
      select: { id: true },
    });

    if (images.length !== imageIds.length) {
      throw new BadRequestError('One or more images do not belong to this product.');
    }

    // Check for duplicates
    const uniqueIds = new Set(imageIds);
    if (uniqueIds.size !== imageIds.length) {
      throw new BadRequestError('Duplicate image IDs are not allowed.');
    }

    // Update sort orders in a transaction
    return prisma.$transaction(async (tx) => {
      for (let i = 0; i < imageIds.length; i++) {
        await tx.productImage.update({
          where: { id: imageIds[i] },
          data: { sortOrder: i },
        });
      }
      return tx.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
    });
  }

  static async updateImage(
    productId: string,
    imageId: string,
    input: { altText?: string; sortOrder?: number },
  ) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundError('Image not found for this product.');
    }

    // If updating sortOrder, check for conflicts
    if (input.sortOrder !== undefined) {
      const existing = await prisma.productImage.findFirst({
        where: { productId, sortOrder: input.sortOrder, NOT: { id: imageId } },
      });
      if (existing) {
        throw new BadRequestError('An image with this sort order already exists.');
      }
    }

    return prisma.productImage.update({
      where: { id: imageId },
      data: {
        altText: input.altText ?? image.altText,
        sortOrder: input.sortOrder ?? image.sortOrder,
      },
    });
  }

  static async deleteImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundError('Image not found for this product.');
    }

    const wasPrimary = image.isPrimary;

    // Delete from Cloudinary first
    try {
      await deleteImage(image.publicId);
    } catch (cloudinaryError) {
      // Log but continue with database deletion
      console.error('Cloudinary delete failed:', cloudinaryError);
    }

    // Delete from database
    await prisma.productImage.delete({ where: { id: imageId } });

    // If deleted image was primary, promote the next image
    if (wasPrimary) {
      const nextImage = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (nextImage) {
        await prisma.productImage.update({
          where: { id: nextImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true };
  }

  static async deleteProductImages(productId: string) {
    const images = await prisma.productImage.findMany({
      where: { productId },
      select: { publicId: true },
    });

    // Delete from Cloudinary
    for (const image of images) {
      try {
        await deleteImage(image.publicId);
      } catch (error) {
        console.error(`Failed to delete Cloudinary image ${image.publicId}:`, error);
      }
    }

    // Database records will be cascade deleted via Prisma relation
  }

  static async replaceImage(productId: string, imageId: string, fileBuffer: Buffer) {
    const existingImage = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!existingImage) {
      throw new NotFoundError('Image not found for this product.');
    }

    // Upload new image to Cloudinary
    const cloudinaryResult = await uploadImage(fileBuffer, productId);

    // Delete old Cloudinary image
    try {
      await deleteImage(existingImage.publicId);
    } catch (error) {
      console.error('Failed to delete old Cloudinary image:', error);
    }

    // Update database record
    return prisma.productImage.update({
      where: { id: imageId },
      data: {
        url: cloudinaryResult.url,
        publicId: cloudinaryResult.publicId,
      },
    });
  }
}
