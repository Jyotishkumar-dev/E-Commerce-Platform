import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createOrderSchema } from '../validators/order.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createOrderSchema), OrderController.createOrder);
router.get('/', OrderController.getOrders);
router.get('/:orderId', OrderController.getOrder);

export { router as orderRouter };
