import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createCategorySchema } from '../validators/category.validator.js';

const router = Router();

router.get('/', CategoryController.getCategories);
router.get('/:slug', CategoryController.getCategory);
router.post('/', authenticate, allowRoles('ADMIN'), validateBody(createCategorySchema), CategoryController.createCategory);

export { router as categoryRouter };
