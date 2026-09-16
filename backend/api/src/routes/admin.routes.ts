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
import { createProductSchema, updateProductSchema, updateStockSchema } from '../validators/product.validator.js';
import { analyticsQuerySchema } from '../validators/admin.validator.js';
import { couponValidateSchema } from '../validators/admin.validator.js';

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
router.post('/products', validateBody(createProductSchema), AdminController.createProduct);
router.patch('/products/:productId', validateBody(updateProductSchema), AdminController.updateProduct);
router.patch('/products/:productId/stock', validateBody(updateStockSchema), AdminController.updateProductStock);

// Analytics
router.get('/analytics', validateQuery(analyticsQuerySchema), AdminController.getAnalytics);

// Coupon Validation
router.post('/coupons/validate', validateBody(couponValidateSchema), AdminController.validateCoupon);

// Inventory
router.get('/inventory', AdminController.getInventory);

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