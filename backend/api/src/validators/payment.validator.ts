import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  orderId: z.string().cuid(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        captured: z.boolean().optional(),
      }),
    }),
  }),
});