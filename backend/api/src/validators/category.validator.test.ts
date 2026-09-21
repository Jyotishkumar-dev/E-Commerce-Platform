import { describe, expect, it } from 'vitest';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';

describe('Category Validators', () => {
  describe('createCategorySchema', () => {
    it('accepts valid category', () => {
      const result = createCategorySchema.safeParse({
        name: 'Electronics',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid slug', () => {
      const result = createCategorySchema.safeParse({
        name: 'Electronics',
        slug: 'electronics',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = createCategorySchema.safeParse({
        name: 'E',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid slug format', () => {
      const result = createCategorySchema.safeParse({
        name: 'Electronics',
        slug: 'INVALID SLUG',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCategorySchema', () => {
    it('accepts partial update', () => {
      const result = updateCategorySchema.safeParse({
        name: 'Updated Electronics',
      });
      expect(result.success).toBe(true);
    });
  });
});
