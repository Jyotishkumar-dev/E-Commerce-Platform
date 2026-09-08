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

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      return ok(res, req, { user }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      return ok(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);
      return ok(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      return ok(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}
