import { describe, expect, it } from 'vitest';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  productIdParamSchema,
  reviewIdParamSchema,
} from '../validators/review.validator.js';

describe('Review Validators', () => {
  describe('createReviewSchema', () => {
    it('accepts valid review', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 5,
        title: 'Great product',
        body: 'This is a great product, highly recommend!',
      });
      expect(result.success).toBe(true);
    });

    it('accepts review without title (optional)', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 4,
        body: 'Good product overall.',
      });
      expect(result.success).toBe(true);
    });

    it('accepts review with orderId', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 5,
        body: 'Excellent!',
        orderId: 'ord_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects rating < 1', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 0,
        body: 'Bad product',
      });
      expect(result.success).toBe(false);
    });

    it('rejects rating > 5', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 6,
        body: 'Amazing product',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer rating', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 4.5,
        body: 'Good product',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short body', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 5,
        body: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('rejects long body > 2000', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 5,
        body: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid productId', () => {
      const result = createReviewSchema.safeParse({
        productId: 'invalid',
        rating: 5,
        body: 'Good product',
      });
      expect(result.success).toBe(false);
    });

    it('rejects long title > 100', () => {
      const result = createReviewSchema.safeParse({
        productId: 'prod_1',
        rating: 5,
        title: 'x'.repeat(101),
        body: 'Good product',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateReviewSchema', () => {
    it('accepts valid update', () => {
      const result = updateReviewSchema.safeParse({
        rating: 4,
        title: 'Updated title',
        body: 'Updated body content here',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty update (all optional)', () => {
      const result = updateReviewSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects rating < 1', () => {
      const result = updateReviewSchema.safeParse({ rating: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects body too short when provided', () => {
      const result = updateReviewSchema.safeParse({ body: 'short' });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewQuerySchema', () => {
    it('accepts valid query', () => {
      const result = reviewQuerySchema.safeParse({
        productId: 'prod_1',
        status: 'PUBLISHED',
        sort: 'newest',
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it('defaults page and limit', () => {
      const result = reviewQuerySchema.safeParse({
        productId: 'prod_1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('defaults status to null (not provided)', () => {
      const result = reviewQuerySchema.safeParse({
        productId: 'prod_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid sort', () => {
      const result = reviewQuerySchema.safeParse({
        productId: 'prod_1',
        sort: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
      const result = reviewQuerySchema.safeParse({
        productId: 'prod_1',
        status: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('productIdParamSchema', () => {
    it('accepts valid cuid', () => {
      const result = productIdParamSchema.safeParse({
        productId: 'prod_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid cuid', () => {
      const result = productIdParamSchema.safeParse({
        productId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewIdParamSchema', () => {
    it('accepts valid cuid', () => {
      const result = reviewIdParamSchema.safeParse({
        reviewId: 'rev_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid cuid', () => {
      const result = reviewIdParamSchema.safeParse({
        reviewId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
