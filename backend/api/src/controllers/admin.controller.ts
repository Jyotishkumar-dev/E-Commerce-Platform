import type { NextFunction, Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ok } from '../utils/response.js';

export class AdminController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await AdminService.getOverviewMetrics();
      return ok(res, req, metrics, 'Admin overview metrics fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await AdminService.getAllOrders(page, limit);
      return ok(res, req, result, 'All orders fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.updateOrderStatus(req.params.orderId, req.body.status);
      return ok(res, req, { order }, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
