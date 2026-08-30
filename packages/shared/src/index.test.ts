import { describe, expect, it } from 'vitest';
import { productSchema, userSchema, healthResponseSchema } from './index.js';

describe('Shared Schemas & Contracts', () => {
  it('validates a valid user schema', () => {
    const validUser = {
      id: 'usr_123',
      email: 'test@shopvibe.store',
      name: 'Test Customer',
      role: 'CUSTOMER',
    };
    const parsed = userSchema.safeParse(validUser);
    expect(parsed.success).toBe(true);
  });

  it('validates a valid product schema', () => {
    const validProduct = {
      id: 'prod_123',
      title: 'AeroFit Headphones',
      description: 'Spatial audio headphones',
      priceCents: 12999,
      currency: 'INR',
      category: 'Audio',
      imageUrl: null,
      stock: 10,
    };
    const parsed = productSchema.safeParse(validProduct);
    expect(parsed.success).toBe(true);
  });

  it('validates health response schema', () => {
    const health = {
      success: true as const,
      statusCode: 200 as const,
      message: 'API is healthy',
      data: { status: 'ok' as const },
      meta: { timestamp: new Date().toISOString() },
    };
    const parsed = healthResponseSchema.safeParse(health);
    expect(parsed.success).toBe(true);
  });
});
