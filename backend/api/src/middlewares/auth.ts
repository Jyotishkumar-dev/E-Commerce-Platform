import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type TokenPayload = { sub: string; email: string; role: 'CUSTOMER' | 'SELLER' | 'ADMIN' };

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ success: false, message: 'Authentication is required.' });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    request.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return response.status(401).json({ success: false, message: 'Your session is invalid or expired.' });
  }
}

export function allowRoles(...roles: TokenPayload['role'][]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ success: false, message: 'You do not have permission for this action.' });
    }
    next();
  };
}
