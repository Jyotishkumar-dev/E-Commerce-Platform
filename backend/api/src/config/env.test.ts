import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { env, envSchema } from './env.js';

describe('env', () => {
  it('is defined in test environment', () => {
    expect(env).toBeDefined();
    expect(env.NODE_ENV).toBe('test');
  });

  it('has required database and auth config', () => {
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.CORS_ORIGIN).toBeDefined();
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.JWT_REFRESH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});

describe('envSchema', () => {
  const base = {
    DATABASE_URL: 'postgresql://localhost:5432/shopvibe_dev?schema=public',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('allows missing Razorpay vars in development', () => {
    const result = envSchema.safeParse({ ...base, NODE_ENV: 'development' });
    expect(result.success).toBe(true);
  });

  it('allows missing Razorpay vars in test', () => {
    const result = envSchema.safeParse({ ...base, NODE_ENV: 'test' });
    expect(result.success).toBe(true);
  });

  it('requires Razorpay vars in production and names the missing variables', () => {
    const result = envSchema.safeParse({ ...base, NODE_ENV: 'production' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i: z.ZodIssue) => i.message).join(' ');
      expect(message).toContain('RAZORPAY_KEY_ID');
      expect(message).toContain('RAZORPAY_KEY_SECRET');
      expect(message).toContain('RAZORPAY_WEBHOOK_SECRET');
    }
  });

  it('REDIS_URL is optional', () => {
    const result = envSchema.safeParse({ ...base, NODE_ENV: 'development' });
    expect(result.success).toBe(true);
  });
});
