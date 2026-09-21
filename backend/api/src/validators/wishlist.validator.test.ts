import { describe, expect, it } from 'vitest';
import { addWishlistItemSchema } from '../validators/wishlist.validator.js';

describe('Wishlist Validators', () => {
  describe('addWishlistItemSchema', () => {
    it('accepts valid product ID', () => {
      const result = addWishlistItemSchema.safeParse({
        productId: 'prod_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty product ID', () => {
      const result = addWishlistItemSchema.safeParse({
        productId: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing product ID', () => {
      const result = addWishlistItemSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
