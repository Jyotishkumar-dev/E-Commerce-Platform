import type { NextFunction, Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { getParam } from '../utils/params.js';
import { ok, created } from '../utils/response.js';
import { ForbiddenError } from '../utils/errors.js';
import { uploadMultipleImages } from '../middlewares/upload.js';

export class AdminController {
  static requireAdmin(req: Request) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission for this action.');
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const metrics = await AdminService.getDashboardMetrics();
      return ok(res, req, metrics, 'Admin dashboard metrics fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const result = await AdminService.getAllOrders({
        search: req.query.search as string | undefined,
        status: req.query.status as any,
        paymentStatus: req.query.paymentStatus as any,
        paymentProvider: req.query.paymentProvider as any,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      return ok(res, req, result, 'Orders fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const orderId = getParam(req, 'orderId');
      const order = await AdminService.getOrderById(orderId);
      return ok(res, req, { order }, 'Order details fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
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
      this.requireAdmin(req);
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

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const sellerId = req.user!.id;
      const product = await AdminService.createProduct({ ...req.body, sellerId });
      return created(res, req, { product }, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const product = await AdminService.updateProduct(productId, req.body);
      return ok(res, req, { product }, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProductStock(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const { stock } = req.body;
      const product = await AdminService.updateProductStock(productId, stock);
      return ok(res, req, { product }, 'Stock updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const categories = await AdminService.getAllCategories();
      return ok(res, req, { categories }, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const categoryId = getParam(req, 'categoryId');
      const category = await AdminService.updateCategory(categoryId, req.body);
      return ok(res, req, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const categoryId = getParam(req, 'categoryId');
      await AdminService.deleteCategory(categoryId);
      return ok(res, req, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
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
      this.requireAdmin(req);
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
      this.requireAdmin(req);
      const coupon = await AdminService.createCoupon(req.body);
      return created(res, req, { coupon }, 'Coupon created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const couponId = getParam(req, 'couponId');
      const coupon = await AdminService.updateCoupon(couponId, req.body);
      return ok(res, req, { coupon }, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleCouponActive(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const couponId = getParam(req, 'couponId');
      const { isActive } = req.body;
      const coupon = await AdminService.toggleCouponActive(couponId, isActive);
      return ok(
        res,
        req,
        { coupon },
        `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
      );
    } catch (error) {
      next(error);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const analytics = await AdminService.getAnalytics({
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        period: req.query.period as string | undefined,
      });
      return ok(res, req, analytics, 'Analytics fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const { code, minimumOrderValueCents } = req.body;
      const result = await AdminService.validateCoupon({ code, minimumOrderValueCents });
      return ok(res, req, result, 'Coupon validated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getInventory(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const inventory = await AdminService.getInventory();
      return ok(res, req, { inventory }, 'Inventory fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Product Media Management
  // ==========================================

  static async getProductImages(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const images = await AdminService.getProductImages(productId);
      return ok(res, req, { images }, 'Product images fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No image files provided.' });
      }

      const { altText, isPrimary } = req.body;

      const uploadedImages = [];
      for (const file of files) {
        const image = await AdminService.uploadProductImage(productId, file.buffer, {
          altText,
          isPrimary: files.length === 1 && isPrimary !== 'false',
        });
        uploadedImages.push(image);
      }

      return created(res, req, { images: uploadedImages }, 'Image(s) uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async setPrimaryImage(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const { imageId } = req.body;
      const image = await AdminService.setPrimaryImage(productId, imageId);
      return ok(res, req, { image }, 'Primary image set successfully');
    } catch (error) {
      next(error);
    }
  }

  static async reorderImages(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const { imageIds } = req.body;
      const images = await AdminService.reorderImages(productId, imageIds);
      return ok(res, req, { images }, 'Images reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateImage(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const imageId = getParam(req, 'imageId');
      const image = await AdminService.updateImage(productId, imageId, req.body);
      return ok(res, req, { image }, 'Image updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const imageId = getParam(req, 'imageId');
      await AdminService.deleteImage(productId, imageId);
      return ok(res, req, null, 'Image deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async replaceImage(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const productId = getParam(req, 'productId');
      const imageId = getParam(req, 'imageId');
      const file = req.file as Express.Multer.File;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No image file provided.' });
      }

      const image = await AdminService.replaceImage(productId, imageId, file.buffer);
      return ok(res, req, { image }, 'Image replaced successfully');
    } catch (error) {
      next(error);
    }
  }
}
