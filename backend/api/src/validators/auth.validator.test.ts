import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

describe('Auth Validators', () => {
  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'short',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short name', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
        name: 'A',
      });
      expect(result.success).toBe(false);
    });

    it('accepts registration without name (optional)', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid phone number', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
        phone: '+919876543210',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid phone number', () => {
      const result = registerSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
        phone: '123',
      });
      expect(result.success).toBe(false);
    });

    it('trims and lowercases email', () => {
      const result = registerSchema.safeParse({
        email: '  Test@Shopvibe.Store  ',
        password: 'password123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@shopvibe.store');
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@shopvibe.store',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts valid profile update', () => {
      const result = updateProfileSchema.safeParse({
        name: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid phone', () => {
      const result = updateProfileSchema.safeParse({
        phone: '+919876543210',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid avatar URL', () => {
      const result = updateProfileSchema.safeParse({
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid avatar URL', () => {
      const result = updateProfileSchema.safeParse({
        avatarUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'newPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short new password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'oldPassword123',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@shopvibe.store',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid reset', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        newPassword: 'newPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        newPassword: 'newPassword123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short new password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'abc123',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });
});
