import { z } from 'zod';

export const createAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.').max(100),
  phone: z.string().trim().regex(/^[+]?[0-9]{10,14}$/, 'Please enter a valid 10-digit mobile number.'),
  addressLine1: z.string().trim().min(5, 'Street address / line 1 is required.').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required.').max(100),
  state: z.string().trim().min(2, 'State is required.').max(100),
  postalCode: z.string().trim().min(4, 'Postal code is required.').max(12),
  country: z.string().trim().default('India'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();
