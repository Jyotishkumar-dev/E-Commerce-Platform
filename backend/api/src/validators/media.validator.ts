import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.string().cuid(),
});

export const imageIdParamSchema = z.object({
  productId: z.string().cuid(),
  imageId: z.string().cuid(),
});

export const uploadImageSchema = z.object({
  altText: z.string().trim().max(200).optional(),
  isPrimary: z.preprocess((val) => {
    if (val === 'true' || val === true || val === 1 || val === '1') return true;
    if (val === 'false' || val === false || val === 0 || val === '0') return false;
    return undefined;
  }, z.boolean().optional()),
});

export const setPrimaryImageSchema = z.object({
  imageId: z.string().cuid(),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().cuid()).min(1),
});

export const updateImageSchema = z.object({
  altText: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const imageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
