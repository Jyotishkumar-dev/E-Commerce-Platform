import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller.js';
import { authenticate, allowRoles } from '../middlewares/auth.js';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.js';
import {
  reviewQuerySchema,
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  productIdParamSchema,
  adminReviewFiltersSchema,
  adminReviewModerationSchema,
} from '../validators/review.validator.js';

const router = Router();

// Public/Customer routes
router.get('/products/:productId/reviews', validateParams(productIdParamSchema), validateQuery(reviewQuerySchema), ReviewController.getProductReviews);
router.get('/products/:productId/reviews/summary', validateParams(productIdParamSchema), ReviewController.getReviewSummary);
router.get('/products/:productId/reviews/me', authenticate, validateParams(productIdParamSchema), ReviewController.getUserReview);

router.post('/products/:productId/reviews', authenticate, validateParams(productIdParamSchema), validateBody(createReviewSchema), ReviewController.createReview);
router.patch('/reviews/:reviewId', authenticate, validateParams(reviewIdParamSchema), validateBody(updateReviewSchema), ReviewController.updateReview);
router.delete('/reviews/:reviewId', authenticate, validateParams(reviewIdParamSchema), ReviewController.deleteReview);

// Admin routes
router.use('/admin', authenticate, allowRoles('ADMIN'));
router.get('/admin/reviews', validateQuery(adminReviewFiltersSchema), ReviewController.getAllReviews);
router.patch('/admin/reviews/:reviewId/moderate', validateParams(reviewIdParamSchema), validateBody(adminReviewModerationSchema), ReviewController.moderateReview);

export { router as reviewRouter };