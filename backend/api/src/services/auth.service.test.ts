import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((callback) => (Array.isArray(callback) ? Promise.all(callback) : callback(prisma))),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    passwordResetToken: {
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

  it('updates profile successfully', async () => {
    vi.mocked(prisma.user.update).mockResolvedValueOnce({
      id: 'usr_1',
      email: 'user@shopvibe.store',
      name: 'Updated Name',
      phone: '+919876543210',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'CUSTOMER',
      updatedAt: new Date(),
    } as any);

    const updated = await AuthService.updateProfile('usr_1', {
      name: 'Updated Name',
      phone: '+919876543210',
    });

    expect(updated.name).toBe('Updated Name');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'usr_1' },
      }),
    );
  });

  it('throws BadRequestError when changing password with incorrect current password', async () => {
    const currentHash = await bcrypt.hash('correctOldPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1',
      passwordHash: currentHash,
    } as any);

    await expect(
      AuthService.changePassword('usr_1', 'wrongOldPassword', 'brandNewPassword123'),
    ).rejects.toThrow(BadRequestError);
  });

  it('changes password when current password matches', async () => {
    const currentHash = await bcrypt.hash('correctOldPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: 'usr_1',
      passwordHash: currentHash,
    } as any);
    vi.mocked(prisma.user.update).mockResolvedValueOnce({} as any);

    const res = await AuthService.changePassword('usr_1', 'correctOldPassword', 'brandNewPassword123');
    expect(res.message).toContain('Password changed');
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('returns generic response for password reset to prevent email enumeration', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    const res = await AuthService.requestPasswordReset('nonexistent@shopvibe.store');
    expect(res.message).toContain('instructions have been generated');
  });
});
