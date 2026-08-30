import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { createProductSchema, productQuerySchema, updateProductSchema } from '../validators/product.validator.js';

const router = Router();

router.get('/', validateQuery(productQuerySchema), ProductController.getProducts);
router.get('/:productId', ProductController.getProduct);
router.post('/', authenticate, allowRoles('ADMIN', 'SELLER'), validateBody(createProductSchema), ProductController.createProduct);
router.patch('/:productId', authenticate, allowRoles('ADMIN', 'SELLER'), validateBody(updateProductSchema), ProductController.updateProduct);
router.delete('/:productId', authenticate, allowRoles('ADMIN', 'SELLER'), ProductController.deleteProduct);

export { router as productRouter };
