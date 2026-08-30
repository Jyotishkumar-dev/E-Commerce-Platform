import crypto from 'node:crypto';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

type SessionUser = { id: string; email: string; role: 'CUSTOMER' | 'SELLER' | 'ADMIN' };
const refreshCookieName = 'shopvibe_refresh';
const legacyRefreshCookieName = 'smart_commerce_refresh';

export function issueAccessToken(user: SessionUser) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export async function createRefreshSession(response: Response, userId: string) {
  const rawToken = crypto.randomBytes(48).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  response.cookie(refreshCookieName, rawToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: '/api/v1/auth' });
}

export async function rotateRefreshSession(response: Response, rawToken?: string) {
  if (!rawToken) return null;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const session = await prisma.refreshToken.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } }, include: { user: true } });
  if (!session) return null;
  await prisma.refreshToken.delete({ where: { id: session.id } });
  await createRefreshSession(response, session.userId);
  return session.user;
}

export async function endRefreshSession(response: Response, rawToken?: string) {
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }
  response.clearCookie(refreshCookieName, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth' });
  response.clearCookie(legacyRefreshCookieName, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/v1/auth' });
}

export function readCookie(header?: string, name = refreshCookieName) {
  const cookies = header?.split(';').map((entry) => entry.trim()) ?? [];
  const primary = cookies.find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1);
  if (primary) return primary;
  return cookies.find((entry) => entry.startsWith(`${legacyRefreshCookieName}=`))?.slice(legacyRefreshCookieName.length + 1);
}
