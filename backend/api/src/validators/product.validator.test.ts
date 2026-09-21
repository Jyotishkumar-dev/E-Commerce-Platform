import { describe, expect, it } from 'vitest';
import {
  productQuerySchema,
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} from '../validators/product.validator.js';

describe('Product Validators', () => {
  describe('productQuerySchema', () => {
    it('accepts valid query', () => {
      const result = productQuerySchema.safeParse({
        search: 'headphones',
        category: 'Audio',
        minPrice: 100,
        maxPrice: 10000,
        inStock: true,
        sort: 'price_asc',
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('defaults sort to newest', () => {
      const result = productQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe('newest');
      }
    });

    it('accepts inStock true', () => {
      const result = productQuerySchema.safeParse({ inStock: true });
      expect(result.success).toBe(true);
    });

    it('accepts inStock false', () => {
      const result = productQuerySchema.safeParse({ inStock: false });
      expect(result.success).toBe(true);
    });

    it('rejects negative minPrice', () => {
      const result = productQuerySchema.safeParse({ minPrice: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects negative maxPrice', () => {
      const result = productQuerySchema.safeParse({ maxPrice: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('createProductSchema', () => {
    it('accepts valid product', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        stock: 10,
        category: 'Audio',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional slug', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        stock: 10,
        category: 'Audio',
        slug: 'test-product',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short title', () => {
      const result = createProductSchema.safeParse({
        title: 'A',
        priceCents: 12999,
        stock: 10,
        category: 'Audio',
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero price', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 0,
        stock: 10,
        category: 'Audio',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: -100,
        stock: 10,
        category: 'Audio',
      });
      expect(result.success).toBe(false);
    });

    it('accepts zero stock', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        stock: 0,
        category: 'Audio',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative stock', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        stock: -1,
        category: 'Audio',
      });
      expect(result.success).toBe(false);
    });

    it('accepts compareAtPriceCents', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        compareAtPriceCents: 15999,
        stock: 10,
        category: 'Audio',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid slug format', () => {
      const result = createProductSchema.safeParse({
        title: 'Test Product',
        priceCents: 12999,
        stock: 10,
        category: 'Audio',
        slug: 'INVALID SLUG',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateStockSchema', () => {
    it('accepts valid stock', () => {
      const result = updateStockSchema.safeParse({ stock: 50 });
      expect(result.success).toBe(true);
    });

    it('rejects negative stock', () => {
      const result = updateStockSchema.safeParse({ stock: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProductSchema', () => {
    it('accepts partial update', () => {
      const result = updateProductSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });
  });
});
