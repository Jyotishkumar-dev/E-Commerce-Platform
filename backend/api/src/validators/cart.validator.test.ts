import { describe, expect, it } from 'vitest';
import {
  addCartItemSchema,
  updateCartItemSchema,
} from '../validators/cart.validator.js';

describe('Cart Validators', () => {
  describe('addCartItemSchema', () => {
    it('accepts valid product ID and quantity', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
        quantity: 2,
      });
      expect(result.success).toBe(true);
    });

    it('defaults quantity to 1', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
      }
    });

    it('rejects empty productId', () => {
      const result = addCartItemSchema.safeParse({
        productId: '',
        quantity: 1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity 0', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative quantity', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity > 20', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
        quantity: 21,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer quantity', () => {
      const result = addCartItemSchema.safeParse({
        productId: 'prod_1',
        quantity: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCartItemSchema', () => {
    it('accepts quantity 0', () => {
      const result = updateCartItemSchema.safeParse({
        quantity: 0,
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid quantity', () => {
      const result = updateCartItemSchema.safeParse({
        quantity: 5,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative quantity', () => {
      const result = updateCartItemSchema.safeParse({
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity > 20', () => {
      const result = updateCartItemSchema.safeParse({
        quantity: 21,
      });
      expect(result.success).toBe(false);
    });
  });
});
