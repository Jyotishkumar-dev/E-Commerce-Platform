import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
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

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
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

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully.' };
  }

  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Account enumeration protection: always return generic response
    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Diagnostic logging in development mode
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Shopvibe Dev] Password reset token for ${email}: ${rawToken}`);
      }
    }

    return {
      message: 'If an account exists with this email address, password reset instructions have been generated.',
    };
  }

  static async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken || !resetToken.user.isActive) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      // Invalidate all active refresh sessions to force re-login
      prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return { message: 'Password has been reset successfully. Please sign in with your new password.' };
  }
}
