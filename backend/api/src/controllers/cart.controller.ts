import type { NextFunction, Request, Response } from 'express';
import { CartService } from '../services/cart.service.js';
import { created, ok } from '../utils/response.js';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.getCart(req.user!.id);
      return ok(res, req, { cart }, 'Cart fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, quantity } = req.body;
      const cart = await CartService.addItem(req.user!.id, productId, quantity);
      return created(res, req, { cart }, 'Item added to bag');
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = req.body;
      const cart = await CartService.updateItem(req.user!.id, req.params.productId, quantity);
      return ok(res, req, { cart }, 'Cart updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.removeItem(req.user!.id, req.params.productId);
      return ok(res, req, { cart }, 'Item removed from bag');
    } catch (error) {
      next(error);
    }
  }
}
