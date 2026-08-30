import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens.').optional(),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
