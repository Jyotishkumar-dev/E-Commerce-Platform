import type { NextFunction, Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { getParam } from '../utils/params.js';
import { ok, created } from '../utils/response.js';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await AdminService.getDashboardMetrics();
      return ok(res, req, metrics, 'Admin dashboard metrics fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        paymentStatus: req.query.paymentStatus as string | undefined,
        paymentProvider: req.query.paymentProvider as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const result = await AdminService.getAllOrders(filters);
      return ok(res, req, result, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = getParam(req, 'orderId');
      const order = await AdminService.getOrderById(orderId);
      return ok(res, req, { order }, 'Order details fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = getParam(req, 'orderId');
      const { status } = req.body;
      const order = await AdminService.updateOrderStatus(orderId, status);
      return ok(res, req, { order }, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        lowStock: req.query.lowStock === 'true',
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const result = await AdminService.getAllProducts(filters);
      return ok(res, req, result, 'Products fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await AdminService.getAllCategories();
      return ok(res, req, { categories }, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = getParam(req, 'categoryId');
      const category = await AdminService.updateCategory(categoryId, req.body);
      return ok(res, req, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = getParam(req, 'categoryId');
      await AdminService.deleteCategory(categoryId);
      return ok(res, req, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const result = await AdminService.getAllCustomers(filters);
      return ok(res, req, result, 'Customers fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const result = await AdminService.getAllCoupons(filters);
      return ok(res, req, result, 'Coupons fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await AdminService.createCoupon(req.body);
      return created(res, req, { coupon }, 'Coupon created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const couponId = getParam(req, 'couponId');
      const coupon = await AdminService.updateCoupon(couponId, req.body);
      return ok(res, req, { coupon }, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleCouponActive(req: Request, res: Response, next: NextFunction) {
    try {
      const couponId = getParam(req, 'couponId');
      const { isActive } = req.body;
      const coupon = await AdminService.toggleCouponActive(couponId, isActive);
      return ok(res, req, { coupon }, `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }
}