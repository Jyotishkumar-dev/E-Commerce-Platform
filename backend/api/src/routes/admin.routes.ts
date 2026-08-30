import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { allowRoles, authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, allowRoles('ADMIN'));

router.get('/overview', AdminController.getOverview);
router.get('/orders', AdminController.getOrders);
router.patch('/orders/:orderId/status', AdminController.updateOrderStatus);

export { router as adminRouter };
