import { describe, expect, it } from 'vitest';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundSchema,
} from '../validators/payment.validator.js';

describe('Payment Validators', () => {
  describe('createPaymentOrderSchema', () => {
    it('accepts valid order ID', () => {
      const result = createPaymentOrderSchema.safeParse({
        orderId: 'cdu_abc123def456',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid order ID', () => {
      const result = createPaymentOrderSchema.safeParse({
        orderId: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('verifyPaymentSchema', () => {
    it('accepts valid verification data', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig_1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing order ID', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig_1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing payment ID', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpay_order_id: 'order_1',
        razorpay_signature: 'sig_1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing signature', () => {
      const result = verifyPaymentSchema.safeParse({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('accepts valid refund', () => {
      const result = refundSchema.safeParse({
        reason: 'Customer request',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty refund (no optional fields)', () => {
      const result = refundSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
