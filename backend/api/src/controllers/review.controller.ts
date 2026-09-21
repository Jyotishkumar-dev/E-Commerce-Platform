import type { NextFunction, Request, Response } from 'express';
import { ReviewService } from '../services/review.service.js';
import { getParam } from '../utils/params.js';
import { ok, created } from '../utils/response.js';
import { ForbiddenError } from '../utils/errors.js';

export class ReviewController {
  static async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = getParam(req, 'productId');
      const result = await ReviewService.getProductReviews({
        productId,
        status: req.query.status as any,
        sort: req.query.sort as any,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
      });
      return ok(res, req, result, 'Reviews fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getReviewSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = getParam(req, 'productId');
      const summary = await ReviewService.getReviewSummary(productId);
      return ok(res, req, summary, 'Review summary fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await ReviewService.createReview(req.user!.id, {
        productId: req.body.productId,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
        orderId: req.body.orderId,
      });
      return created(res, req, { review }, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateReview(req: Request, res: Response, next: NextFunction) {
    try {
      const reviewId = getParam(req, 'reviewId');
      const review = await ReviewService.updateReview(req.user!.id, reviewId, {
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
      });
      return ok(res, req, { review }, 'Review updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const reviewId = getParam(req, 'reviewId');
      await ReviewService.deleteReview(req.user!.id, reviewId);
      return ok(res, req, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserReview(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = getParam(req, 'productId');
      const review = await ReviewService.getUserReviewForProduct(req.user!.id, productId);
      return ok(res, req, { review }, 'User review fetched');
    } catch (error) {
      next(error);
    }
  }

  // Admin methods
  static async getAllReviews(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const result = await ReviewService.getAllReviews({
        search: req.query.search as string | undefined,
        rating: req.query.rating ? Number(req.query.rating) : undefined,
        status: req.query.status as any,
        productId: req.query.productId as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      return ok(res, req, result, 'Reviews fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async moderateReview(req: Request, res: Response, next: NextFunction) {
    try {
      this.requireAdmin(req);
      const reviewId = getParam(req, 'reviewId');
      const { status } = req.body;
      const review = await ReviewService.moderateReview(reviewId, status);
      return ok(res, req, { review }, `Review ${status.toLowerCase()} successfully`);
    } catch (error) {
      next(error);
    }
  }

  static requireAdmin(req: Request) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission for this action.');
    }
  }
}