import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { validateQuery, validateBody } from '../middlewares/validate.js';
import {
  adminOrderFiltersSchema,
  updateOrderStatusSchema,
  adminProductFiltersSchema,
  adminCustomerFiltersSchema,
  adminCouponFiltersSchema,
  createCouponSchema,
  updateCouponSchema,
  toggleCouponActiveSchema,
} from '../validators/admin.validator.js';

const router = Router();

router.use(authenticate, allowRoles('ADMIN'));

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Orders
router.get('/orders', validateQuery(adminOrderFiltersSchema), AdminController.getOrders);
router.get('/orders/:orderId', AdminController.getOrder);
router.patch('/orders/:orderId/status', validateBody(updateOrderStatusSchema), AdminController.updateOrderStatus);

// Products
router.get('/products', validateQuery(adminProductFiltersSchema), AdminController.getProducts);

// Categories
router.get('/categories', AdminController.getCategories);
router.patch('/categories/:categoryId', AdminController.updateCategory);
router.delete('/categories/:categoryId', AdminController.deleteCategory);

// Customers
router.get('/customers', validateQuery(adminCustomerFiltersSchema), AdminController.getCustomers);

// Coupons
router.get('/coupons', validateQuery(adminCouponFiltersSchema), AdminController.getCoupons);
router.post('/coupons', validateBody(createCouponSchema), AdminController.createCoupon);
router.patch('/coupons/:couponId', validateBody(updateCouponSchema), AdminController.updateCoupon);
router.patch('/coupons/:couponId/active', validateBody(toggleCouponActiveSchema), AdminController.toggleCouponActive);

export { router as adminRouter };