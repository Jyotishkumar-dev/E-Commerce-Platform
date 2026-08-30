import { z } from 'zod';

export const createOrderSchema = z.object({
  shippingAddressId: z.string().cuid().optional(),
  couponCode: z.string().trim().toUpperCase().optional(),
});
