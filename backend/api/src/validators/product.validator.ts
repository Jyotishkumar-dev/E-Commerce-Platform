import { z } from 'zod';

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'title_asc']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters.').max(200),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens.').optional(),
  description: z.string().trim().max(5000).optional(),
  priceCents: z.coerce.number().int().positive('Price must be greater than zero.'),
  compareAtPriceCents: z.coerce.number().int().positive().optional(),
  category: z.string().trim().default('General'),
  categoryId: z.string().cuid().optional(),
  sku: z.string().trim().toUpperCase().max(50).optional(),
  brand: z.string().trim().max(100).optional(),
  imageUrl: z.string().url().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const updateProductSchema = createProductSchema.partial();
