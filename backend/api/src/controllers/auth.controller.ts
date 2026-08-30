import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { created, ok } from '../utils/response.js';
import { readCookie } from '../utils/session.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body, res);
      return created(res, req, result, 'Account created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body, res);
      return ok(res, req, result, 'Signed in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async refreshSession(req: Request, res: Response, next: NextFunction) {
    try {
      const token = readCookie(req.header('cookie'));
      const result = await AuthService.refreshSession(token, res);
      return ok(res, req, result, 'Session refreshed');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = readCookie(req.header('cookie'));
      await AuthService.logout(token, res);
      return ok(res, req, null, 'Signed out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getCurrentUser(req.user!.id);
      return ok(res, req, { user }, 'User profile fetched');
    } catch (error) {
      next(error);
    }
  }
}
