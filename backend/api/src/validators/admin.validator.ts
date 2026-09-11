import { z } from 'zod';

export const adminOrderFiltersSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  paymentStatus: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']).optional(),
  paymentProvider: z.enum(['RAZORPAY', 'COD', 'STRIPE']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export const adminProductFiltersSchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true || val === 1 || val === '1') return true;
    if (val === 'false' || val === false || val === 0 || val === '0') return false;
    return undefined;
  }, z.boolean().optional()),
  lowStock: z.preprocess((val) => {
    if (val === 'true' || val === true || val === 1 || val === '1') return true;
    if (val === 'false' || val === false || val === 0 || val === '0') return false;
    return undefined;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminCustomerFiltersSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const adminCouponFiltersSchema = z.object({
  search: z.string().trim().optional(),
  isActive: z.preprocess((val) => {
    if (val === 'true' || val === true || val === 1 || val === '1') return true;
    if (val === 'false' || val === false || val === 0 || val === '0') return false;
    return undefined;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(50).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.coerce.number().int().positive(),
  minimumOrderValueCents: z.coerce.number().int().nonnegative().default(0),
  maximumDiscountCents: z.coerce.number().int().positive().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  description: z.string().trim().max(500).optional(),
});

export const updateCouponSchema = createCouponSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const toggleCouponActiveSchema = z.object({
  isActive: z.boolean(),
});