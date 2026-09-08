import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { allowRoles, authenticate } from './auth.js';

vi.mock('../config/env.js', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long-key',
  },
}));

describe('Auth Middleware', () => {
  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('returns 401 when Authorization header is missing', () => {
    const req = { header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Authentication is required.',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when JWT token is invalid or expired', () => {
    const req = { header: vi.fn().mockReturnValue('Bearer invalid.jwt.token') } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Your session is invalid or expired.',
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches user payload to request on valid token', () => {
    const token = jwt.sign(
      { sub: 'usr_123', email: 'user@shopvibe.store', role: 'CUSTOMER' },
      'test-secret-at-least-32-characters-long-key',
    );
    const req = { header: vi.fn().mockReturnValue(`Bearer ${token}`) } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(req.user).toEqual({
      id: 'usr_123',
      email: 'user@shopvibe.store',
      role: 'CUSTOMER',
    });
    expect(next).toHaveBeenCalled();
  });

  describe('allowRoles', () => {
    it('returns 403 Forbidden when user role is not allowed', () => {
      const req = {
        user: { id: 'usr_123', email: 'user@shopvibe.store', role: 'CUSTOMER' },
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const guard = allowRoles('ADMIN');
      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'You do not have permission for this action.',
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('allows access when user has the allowed role', () => {
      const req = {
        user: { id: 'usr_admin', email: 'admin@shopvibe.store', role: 'ADMIN' },
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const guard = allowRoles('ADMIN');
      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
