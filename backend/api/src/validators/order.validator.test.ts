import { describe, expect, it } from 'vitest';
import {
  createOrderSchema,
  cancelOrderSchema,
} from '../validators/order.validator.js';

describe('Order Validators', () => {
  describe('createOrderSchema', () => {
    it('accepts valid order', () => {
      const result = createOrderSchema.safeParse({
        shippingAddressId: 'addr_1',
      });
      expect(result.success).toBe(true);
    });

    it('accepts order with coupon', () => {
      const result = createOrderSchema.safeParse({
        couponCode: 'DISCOUNT10',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty order (no optional fields)', () => {
      const result = createOrderSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('uppercases coupon code', () => {
      const result = createOrderSchema.safeParse({
        couponCode: 'discount10',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.couponCode).toBe('DISCOUNT10');
      }
    });
  });

  describe('cancelOrderSchema', () => {
    it('accepts valid cancel', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'Changed my mind',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty cancel (no optional fields)', () => {
      const result = cancelOrderSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts long reason (up to 500)', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'x'.repeat(500),
      });
      expect(result.success).toBe(true);
    });

    it('rejects reason > 500', () => {
      const result = cancelOrderSchema.safeParse({
        reason: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });
});
