import type { NextFunction, Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { created, ok } from '../utils/response.js';

export class OrderController {
  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.createOrder(req.user!.id, req.body);
      return created(res, req, { order }, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await OrderService.getOrders(req.user!.id);
      return ok(res, req, { orders }, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getOrderById(req.user!.id, req.params.orderId, req.user!.role);
      return ok(res, req, { order }, 'Order details fetched');
    } catch (error) {
      next(error);
    }
  }
}
