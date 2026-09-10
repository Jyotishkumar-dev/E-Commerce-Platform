import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createPaymentOrderSchema, verifyPaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.use(authenticate);

router.post('/create-order', validateBody(createPaymentOrderSchema), PaymentController.createPaymentOrder);
router.post('/verify', validateBody(verifyPaymentSchema), PaymentController.verifyPayment);
router.post('/retry/:orderId', PaymentController.retryPayment);
router.post('/cancel/:orderId', PaymentController.cancelPayment);

router.post('/webhook', PaymentController.handleWebhook);

export { router as paymentRouter };