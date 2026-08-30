import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { addCartItemSchema, updateCartItemSchema } from '../validators/cart.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/items', validateBody(addCartItemSchema), CartController.addItem);
router.patch('/items/:productId', validateBody(updateCartItemSchema), CartController.updateItem);
router.delete('/items/:productId', CartController.removeItem);

export { router as cartRouter };
