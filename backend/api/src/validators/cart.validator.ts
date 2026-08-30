import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(20, 'Maximum 20 units per item.').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative.').max(20, 'Maximum 20 units per item.'),
});
