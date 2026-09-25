import { z } from 'zod';

export const reviewStatusSchema = z.enum(['PUBLISHED', 'PENDING', 'HIDDEN']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const reviewQuerySchema = z.object({
  productId: z.string().cuid(),
  status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN']).optional(),
  sort: z.enum(['newest', 'highest_rated', 'lowest_rated']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(10).max(2000),
  orderId: z.string().cuid().optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(10).max(2000).optional(),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().cuid(),
});

export const productIdParamSchema = z.object({
  productId: z.string().cuid(),
});

export const adminReviewFiltersSchema = z.object({
  search: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN']).optional(),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminReviewModerationSchema = z.object({
  status: z.enum(['PUBLISHED', 'PENDING', 'HIDDEN']),
});
