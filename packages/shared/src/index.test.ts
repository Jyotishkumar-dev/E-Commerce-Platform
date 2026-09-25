import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Import shared schemas
import {
  registerRequestSchema,
  loginRequestSchema,
  productSchema,
  productQuerySchema,
  addCartItemSchema,
  updateCartItemSchema,
  createAddressSchema,
  createProductReviewSchema,
  addToWishlistSchema,
  UserRoleEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
  ReviewStatusEnum,
} from '@e-commerce-platform/shared';

describe('Shared Schemas', () => {
  describe('registerRequestSchema', () => {
    it('validates valid registration', () => {
      const result = registerRequestSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
        name: 'Test',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerRequestSchema.safeParse({
        email: 'bad',
        password: 'password123',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginRequestSchema', () => {
    it('validates valid login', () => {
      const result = loginRequestSchema.safeParse({
        email: 'test@shopvibe.store',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginRequestSchema.safeParse({
        email: 'test@shopvibe.store',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('productSchema', () => {
    it('validates valid product', () => {
      const result = productSchema.safeParse({
        id: 'p1',
        title: 'Test',
        description: null,
        priceCents: 999,
        currency: 'INR',
        category: 'Audio',
        imageUrl: null,
        stock: 5,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative price', () => {
      const result = productSchema.safeParse({
        id: 'p1',
        title: 'Test',
        description: null,
        priceCents: -1,
        currency: 'INR',
        category: 'Audio',
        imageUrl: null,
        stock: 5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('productQuerySchema', () => {
    it('validates query with search', () => {
      const result = productQuerySchema.safeParse({ search: 'test', category: 'Audio' });
      expect(result.success).toBe(true);
    });
  });

  describe('addCartItemSchema', () => {
    it('validates valid cart item', () => {
      const result = addCartItemSchema.safeParse({ productId: 'p1', quantity: 2 });
      expect(result.success).toBe(true);
    });
  });

  describe('createAddressSchema', () => {
    it('validates valid address', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main St',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createProductReviewSchema', () => {
    it('validates valid review', () => {
      const result = createProductReviewSchema.safeParse({
        productId: 'p1',
        rating: 5,
        body: 'Great product!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid rating', () => {
      const result = createProductReviewSchema.safeParse({
        productId: 'p1',
        rating: 6,
        body: 'Great product!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('addToWishlistSchema', () => {
    it('validates valid wishlist item', () => {
      const result = addToWishlistSchema.safeParse({ productId: 'p1' });
      expect(result.success).toBe(true);
    });
  });

  describe('UserRoleEnum', () => {
    it('has correct values', () => {
      expect(Object.values(UserRoleEnum.Values)).toEqual(['CUSTOMER', 'SELLER', 'ADMIN']);
    });
  });

  describe('OrderStatusEnum', () => {
    it('has correct values', () => {
      expect(Object.values(OrderStatusEnum.Values)).toEqual([
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ]);
    });
  });

  describe('PaymentStatusEnum', () => {
    it('has correct values', () => {
      expect(Object.values(PaymentStatusEnum.Values)).toEqual([
        'PENDING',
        'SUCCESS',
        'FAILED',
        'REFUNDED',
      ]);
    });
  });

  describe('ReviewStatusEnum', () => {
    it('has correct values', () => {
      expect(Object.values(ReviewStatusEnum.Values)).toEqual(['PUBLISHED', 'PENDING', 'HIDDEN']);
    });
  });
});
