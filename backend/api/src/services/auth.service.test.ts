import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { prisma } from '../lib/prisma.js';
import { ConflictError, UnauthorizedError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long-key',
    NODE_ENV: 'test',
  },
}));

describe('AuthService', () => {
  const mockResponse = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response;

  it('throws ConflictError when registering with existing email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1',
      email: 'existing@shopvibe.store',
    } as any);

    await expect(
      AuthService.register(
        { email: 'existing@shopvibe.store', password: 'password123', name: 'Test' },
        mockResponse,
      ),
    ).rejects.toThrow(ConflictError);
  });

  it('registers new user and issues access token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: 'usr_2',
      email: 'new@shopvibe.store',
      name: 'New User',
      phone: '+919876543210',
      role: 'CUSTOMER',
      createdAt: new Date(),
    } as any);

    const result = await AuthService.register(
      { email: 'new@shopvibe.store', password: 'password123', name: 'New User' },
      mockResponse,
    );

    expect(result.user.email).toBe('new@shopvibe.store');
    expect(result.accessToken).toBeDefined();
    expect(mockResponse.cookie).toHaveBeenCalled();
  });

  it('throws UnauthorizedError when login password does not match', async () => {
    const hash = await bcrypt.hash('correctPassword123', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1',
      email: 'user@shopvibe.store',
      passwordHash: hash,
      isActive: true,
    } as any);

    await expect(
      AuthService.login(
        { email: 'user@shopvibe.store', password: 'wrongPassword' },
        mockResponse,
      ),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('authenticates valid credentials successfully', async () => {
    const password = 'validPassword123';
    const passwordHash = await bcrypt.hash(password, 10);

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1',
      email: 'user@shopvibe.store',
      name: 'Valid User',
      phone: null,
      role: 'CUSTOMER',
      passwordHash,
      isActive: true,
    } as any);

    const result = await AuthService.login(
      { email: 'user@shopvibe.store', password },
      mockResponse,
    );

    expect(result.user.email).toBe('user@shopvibe.store');
    expect(result.accessToken).toBeDefined();
  });
});
