import type { NextFunction, Request, Response } from 'express';
import { WishlistService } from '../services/wishlist.service.js';
import { created, ok } from '../utils/response.js';

export class WishlistController {
  static async getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await WishlistService.getWishlist(req.user!.id);
      return ok(res, req, { items }, 'Wishlist fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addToWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WishlistService.addToWishlist(req.user!.id, req.params.productId);
      return created(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async removeFromWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WishlistService.removeFromWishlist(req.user!.id, req.params.productId);
      return ok(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }
}
