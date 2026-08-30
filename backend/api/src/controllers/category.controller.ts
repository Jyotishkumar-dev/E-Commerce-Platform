import type { NextFunction, Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';
import { created, ok } from '../utils/response.js';

export class CategoryController {
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getCategories();
      return ok(res, req, { categories }, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getCategoryBySlug(req.params.slug);
      return ok(res, req, { category }, 'Category details fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.createCategory(req.body);
      return created(res, req, { category }, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }
}
