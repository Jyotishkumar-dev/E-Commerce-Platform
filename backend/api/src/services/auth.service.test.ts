import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import type { Response } from 'express';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    passwordResetToken: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long-key',
    NODE_ENV: 'test',
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

const mockRes = {
  cookie: vi.fn(),
  clearCookie: vi.fn(),
} as unknown as Response;

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new user successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const result = await AuthService.register({ email: 'new@shopvibe.store', password: 'password123', name: 'New User' }, mockRes);
    expect(result).toBeDefined();
    expect(result.user.email).toBe('new@shopvibe.store');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('throws ConflictError for duplicate email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'usr_1', email: 'existing@shopvibe.store' });

    await expect(
      AuthService.register({ email: 'existing@shopvibe.store', password: 'password123' }, mockRes)
    ).rejects.toThrow(ConflictError);
  });

  it('logs in with valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1', email: 'test@shopvibe.store', passwordHash: 'hash', name: 'Test', role: 'CUSTOMER',
    });

    await AuthService.login({ email: 'test@shopvibe.store', password: 'password123' }, mockRes);
    expect(prisma.user.findUnique).toHaveBeenCalled();
  });

  it('throws UnauthorizedError with invalid password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1', email: 'test@shopvibe.store', passwordHash: 'hash', name: 'Test', role: 'CUSTOMER',
    });
    vi.mocked(await import('bcryptjs')).default.compare.mockResolvedValueOnce(false);

    await expect(
      AuthService.login({ email: 'test@shopvibe.store', password: 'wrongpass' }, mockRes)
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for unknown user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await expect(
      AuthService.login({ email: 'unknown@shopvibe.store', password: 'password123' }, mockRes)
    ).rejects.toThrow(UnauthorizedError);
  });
});
