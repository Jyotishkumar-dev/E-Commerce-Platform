import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReviewService } from './review.service.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma: Record<string, any> = {
    product: { findUnique: vi.fn() },
    productReview: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    orderItem: { findFirst: vi.fn() },
    order: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  };
  return {
    prisma: {
      ...mockPrisma,
      $transaction: vi.fn(async (cb: (tx: typeof mockPrisma) => Promise<any>) => {
        return cb(mockPrisma);
      }),
    },
  };
});

describe('ReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductReviews', () => {
    it('returns paginated reviews', async () => {
      const mockReviews = [
        {
          id: 'rev_1',
          rating: 5,
          title: 'Great',
          body: 'Excellent',
          productId: 'prod_1',
          userId: 'usr_1',
          isVerifiedPurchase: true,
          status: 'PUBLISHED',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          user: { id: 'usr_1', name: 'John' },
        },
      ] as any;
      vi.mocked(prisma.productReview.findMany).mockResolvedValue(mockReviews);
      vi.mocked(prisma.productReview.count).mockResolvedValue(1);

      const result = await ReviewService.getProductReviews({
        productId: 'prod_1',
        status: 'PUBLISHED',
      });

      expect(result.reviews).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(1);
    });

    it('defaults status to PUBLISHED', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getProductReviews({ productId: 'prod_1' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('supports sort by highest_rated', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getProductReviews({ productId: 'prod_1', sort: 'highest_rated' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'desc' },
        }),
      );
    });

    it('supports sort by lowest_rated', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getProductReviews({ productId: 'prod_1', sort: 'lowest_rated' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'asc' },
        }),
      );
    });
  });

  describe('getReviewSummary', () => {
    it('calculates average rating and distribution', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([
        { rating: 5 } as any,
        { rating: 4 } as any,
        { rating: 5 } as any,
        { rating: 3 } as any,
        { rating: 5 } as any,
      ]);

      const result = await ReviewService.getReviewSummary('prod_1');

      expect(result.totalReviews).toBe(5);
      expect(result.averageRating).toBe(4.4);
      expect(result.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 3 });
    });

    it('returns zero for no reviews', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);

      const result = await ReviewService.getReviewSummary('prod_1');

      expect(result.totalReviews).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.ratingDistribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    });
  });

  describe('createReview', () => {
    it('creates a review successfully', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: true,
      } as any);
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.productReview.create).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        isVerifiedPurchase: false,
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: { id: 'usr_1', name: 'John' },
      } as any);

      const result = await ReviewService.createReview('usr_1', {
        productId: 'prod_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
      });

      expect(result.id).toBe('rev_1');
      expect(result.rating).toBe(5);
    });

    it('throws NotFoundError for inactive product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: false,
      } as any);

      await expect(
        ReviewService.createReview('usr_1', {
          productId: 'prod_1',
          rating: 5,
          body: 'Excellent',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError for duplicate review', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: true,
      } as any);
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({ id: 'rev_1' } as any);

      await expect(
        ReviewService.createReview('usr_1', {
          productId: 'prod_1',
          rating: 5,
          body: 'Excellent',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('verifies purchase from order item', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: true,
      } as any);
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.orderItem.findFirst).mockResolvedValue({ id: 'oi_1' } as any);
      vi.mocked(prisma.productReview.create).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        isVerifiedPurchase: true,
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: { id: 'usr_1', name: 'John' },
      } as any);

      const result = await ReviewService.createReview('usr_1', {
        productId: 'prod_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        orderId: 'ord_1',
      });

      expect(result.isVerifiedPurchase).toBe(true);
    });

    it('auto-detects verified purchase from delivered order', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: true,
      } as any);
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.order.findFirst).mockResolvedValue({ id: 'ord_1' } as any);
      vi.mocked(prisma.productReview.create).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        isVerifiedPurchase: true,
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: { id: 'usr_1', name: 'John' },
      } as any);

      const result = await ReviewService.createReview('usr_1', {
        productId: 'prod_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
      });

      expect(result.isVerifiedPurchase).toBe(true);
    });

    it('sets status to PUBLISHED', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod_1',
        isActive: true,
      } as any);
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.productReview.create).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        isVerifiedPurchase: false,
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: { id: 'usr_1', name: 'John' },
      } as any);

      const result = await ReviewService.createReview('usr_1', {
        productId: 'prod_1',
        rating: 5,
        body: 'Excellent',
      });

      expect(result.status).toBe('PUBLISHED');
    });
  });

  describe('updateReview', () => {
    it('updates review successfully', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      } as any);
      vi.mocked(prisma.productReview.update).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 4,
        title: 'Updated',
        body: 'Updated body',
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        user: { id: 'usr_1', name: 'John' },
      } as any);

      const result = await ReviewService.updateReview('usr_1', 'rev_1', {
        rating: 4,
        title: 'Updated',
        body: 'Updated body',
      });

      expect(result.rating).toBe(4);
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundError for non-existent review', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);

      await expect(ReviewService.updateReview('usr_1', 'rev_999', { rating: 4 })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError for non-owner', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_2',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      } as any);

      await expect(ReviewService.updateReview('usr_1', 'rev_1', { rating: 4 })).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('deleteReview', () => {
    it('deletes review successfully', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_1',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      } as any);
      vi.mocked(prisma.productReview.delete).mockResolvedValue({ id: 'rev_1' } as any);

      await ReviewService.deleteReview('usr_1', 'rev_1');
      expect(prisma.productReview.delete).toHaveBeenCalledWith({ where: { id: 'rev_1' } });
    });

    it('throws NotFoundError for non-existent review', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);

      await expect(ReviewService.deleteReview('usr_1', 'rev_999')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError for non-owner', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({
        id: 'rev_1',
        productId: 'prod_1',
        userId: 'usr_2',
        rating: 5,
        title: 'Great',
        body: 'Excellent',
        status: 'PUBLISHED',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      } as any);

      await expect(ReviewService.deleteReview('usr_1', 'rev_1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getUserReviewForProduct', () => {
    it('returns existing review', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({ id: 'rev_1' } as any);

      const result = await ReviewService.getUserReviewForProduct('usr_1', 'prod_1');

      expect(result).toEqual({ id: 'rev_1' });
    });

    it('returns null if no review', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);

      const result = await ReviewService.getUserReviewForProduct('usr_1', 'prod_1');

      expect(result).toBeNull();
    });
  });

  describe('getAllReviews (admin)', () => {
    it('supports search filter', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getAllReviews({ search: 'great' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.anything() }),
        }),
      );
    });

    it('supports rating filter', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getAllReviews({ rating: 5 });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rating: 5 }),
        }),
      );
    });

    it('supports status filter', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getAllReviews({ status: 'PENDING' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('supports date range filter', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getAllReviews({
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
      });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.anything() }),
        }),
      );
    });

    it('supports userId filter', async () => {
      vi.mocked(prisma.productReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.productReview.count).mockResolvedValue(0);

      await ReviewService.getAllReviews({ userId: 'usr_1' });

      expect(prisma.productReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'usr_1' }),
        }),
      );
    });
  });

  describe('moderateReview', () => {
    it('updates review status', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue({ id: 'rev_1' } as any);
      vi.mocked(prisma.productReview.update).mockResolvedValue({
        id: 'rev_1',
        status: 'HIDDEN',
      } as any);

      const result = await ReviewService.moderateReview('rev_1', 'HIDDEN');

      expect(result.status).toBe('HIDDEN');
    });

    it('throws NotFoundError for non-existent review', async () => {
      vi.mocked(prisma.productReview.findUnique).mockResolvedValue(null);

      await expect(ReviewService.moderateReview('rev_999', 'PUBLISHED')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
