import type { NextFunction, Request, Response } from 'express';
import { ProductService } from '../services/product.service.js';
import { created, ok } from '../utils/response.js';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.getProducts(req.query as any);
      return ok(
        res,
        req,
        {
          products: result.products,
          categories: result.categories,
          pagination: result.pagination,
        },
        'Products fetched successfully',
      );
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductByIdOrSlug(req.params.productId);
      return ok(res, req, { product }, 'Product details fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.user!.id, req.body);
      return created(res, req, { product }, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.updateProduct(req.params.productId, req.body);
      return ok(res, req, { product }, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.deleteProduct(req.params.productId);
      return ok(res, req, null, 'Product deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}
