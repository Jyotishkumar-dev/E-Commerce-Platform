import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address.').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80).optional(),
  phone: z.string().trim().regex(/^[+]?[0-9]{10,14}$/, 'Please enter a valid contact phone number.').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required.'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80).optional(),
  phone: z.string().trim().regex(/^[+]?[0-9]{10,14}$/, 'Please enter a valid contact phone number.').optional(),
  avatarUrl: z.string().url('Please provide a valid avatar URL.').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.').trim(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
});
