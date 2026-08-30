import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import {
  createRefreshSession,
  endRefreshSession,
  issueAccessToken,
  rotateRefreshSession,
} from '../utils/session.js';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async register(input: RegisterInput, res: Response) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError('An account with that email address already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    await createRefreshSession(res, user.id);
    const accessToken = issueAccessToken(user);

    return { user, accessToken };
  }

  static async login(input: LoginInput, res: Response) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedError('Incorrect email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('This account has been deactivated. Please contact support.');
    }

    await createRefreshSession(res, user.id);
    const accessToken = issueAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
    };
  }

  static async refreshSession(rawCookieToken: string | undefined, res: Response) {
    if (!rawCookieToken) {
      throw new UnauthorizedError('Your session has expired. Please sign in again.');
    }

    const user = await rotateRefreshSession(res, rawCookieToken);
    if (!user) {
      throw new UnauthorizedError('Your session is invalid or expired. Please sign in again.');
    }

    const accessToken = issueAccessToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
    };
  }

  static async logout(rawCookieToken: string | undefined, res: Response) {
    await endRefreshSession(res, rawCookieToken);
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    return user;
  }
}
