import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/errors.js';

export interface ReviewQueryInput {
  productId: string;
  status?: 'PUBLISHED' | 'PENDING' | 'HIDDEN';
  sort?: 'newest' | 'highest_rated' | 'lowest_rated';
  page?: number;
  limit?: number;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export class ReviewService {
  static async getProductReviews(query: ReviewQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductReviewWhereInput = {
      productId: query.productId,
    };

    if (query.status) {
      where.status = query.status;
    } else {
      // Default to published reviews for customers
      where.status = 'PUBLISHED';
    }

    let orderBy: Prisma.ProductReviewOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort === 'highest_rated') orderBy = { rating: 'desc' };
    else if (query.sort === 'lowest_rated') orderBy = { rating: 'asc' };

    const [total, reviews] = await Promise.all([
      prisma.productReview.count({ where }),
      prisma.productReview.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async getReviewSummary(productId: string): Promise<ReviewSummary> {
    const reviews = await prisma.productReview.findMany({
      where: { productId, status: 'PUBLISHED' },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let sumRating = 0;
    for (const review of reviews) {
      ratingDistribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
      sumRating += review.rating;
    }

    const averageRating = totalReviews > 0 ? sumRating / totalReviews : 0;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }

  static async createReview(
    userId: string,
    input: {
      productId: string;
      rating: number;
      title?: string;
      body: string;
      orderId?: string;
    },
  ) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or is currently unavailable.');
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.productReview.findUnique({
      where: { productId_userId: { productId: input.productId, userId } },
    });

    if (existingReview) {
      throw new ConflictError(
        'You have already reviewed this product. You can edit your existing review.',
      );
    }

    // Verify purchase if orderId provided
    let isVerifiedPurchase = false;
    if (input.orderId) {
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          orderId: input.orderId,
          productId: input.productId,
          order: { userId, status: 'DELIVERED' },
        },
      });
      if (orderItem) {
        isVerifiedPurchase = true;
      }
    } else {
      // Auto-detect verified purchase from any delivered order
      const deliveredOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: { some: { productId: input.productId } },
        },
        select: { id: true },
      });
      if (deliveredOrder) {
        isVerifiedPurchase = true;
      }
    }

    const review = await prisma.productReview.create({
      data: {
        productId: input.productId,
        userId,
        orderId: input.orderId,
        rating: input.rating,
        title: input.title,
        body: input.body,
        isVerifiedPurchase,
        status: 'PUBLISHED',
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return review;
  }

  static async updateReview(
    userId: string,
    reviewId: string,
    input: {
      rating?: number;
      title?: string;
      body?: string;
    },
  ) {
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review not found.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('You can only edit your own reviews.');
    }

    const updated = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        rating: input.rating,
        title: input.title,
        body: input.body,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return updated;
  }

  static async deleteReview(userId: string, reviewId: string) {
    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundError('Review not found.');
    }

    if (review.userId !== userId) {
      throw new ForbiddenError('You can only delete your own reviews.');
    }

    await prisma.productReview.delete({ where: { id: reviewId } });
  }

  static async getUserReviewForProduct(userId: string, productId: string) {
    return prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } },
    });
  }

  // Admin methods
  static async getAllReviews(filters: {
    search?: string;
    rating?: number;
    status?: 'PUBLISHED' | 'PENDING' | 'HIDDEN';
    productId?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductReviewWhereInput = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { product: { title: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.rating) where.rating = filters.rating;
    if (filters.status) where.status = filters.status;
    if (filters.productId) where.productId = filters.productId;
    if (filters.userId) where.userId = filters.userId;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as any).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.createdAt as any).lte = new Date(filters.dateTo);
    }

    const [total, reviews] = await Promise.all([
      prisma.productReview.count({ where }),
      prisma.productReview.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async moderateReview(reviewId: string, status: 'PUBLISHED' | 'PENDING' | 'HIDDEN') {
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundError('Review not found.');

    return prisma.productReview.update({
      where: { id: reviewId },
      data: { status },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
      },
    });
  }
}
